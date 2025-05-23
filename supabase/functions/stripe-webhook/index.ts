
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyStripeSignature } from "./signatureVerification.ts";
import { initializeSupabase } from "./paymentProcessor.ts";
import { corsHeaders, createResponse, handleCorsOptions } from "./corsUtils.ts";
import { handleCheckoutCompleted, parseStripeEvent, initializeStripe } from "./stripeEventHandler.ts";
import { initSentry } from "../shared/sentry.ts";

// Initialize Sentry for function!
const sentry = initSentry("stripe-webhook");

// This disables JWT verification for this function
export const _preflightOptions = {
  cors: corsHeaders,
  authjwt: false,
};

// Declare the EdgeRuntime interface if it's not already declared
declare global {
  interface EdgeRuntime {
    waitUntil(promise: Promise<any>): void;
  }
  
  var EdgeRuntime: EdgeRuntime;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    console.log("Webhook endpoint called");
    console.log("HTTP Method:", req.method);
    
    // Add request context to Sentry
    sentry.setContext("request", {
      method: req.method,
      url: req.url,
    });
    
    // Get environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    
    // Log headers in a more readable way for debugging
    const headerEntries = Object.fromEntries(req.headers.entries());
    const sensitiveHeaders = ['authorization', 'apikey'];
    const safeHeaders = { ...headerEntries };
    
    // Redact sensitive headers in logs
    for (const header of sensitiveHeaders) {
      if (safeHeaders[header]) {
        safeHeaders[header] = safeHeaders[header].substring(0, 4) + '...';
      }
    }
    
    console.log("Headers:", JSON.stringify(safeHeaders));
    
    // Check that required environment variables are set
    if (!stripeSecretKey) {
      console.error("Missing STRIPE_SECRET_KEY");
      const error = new Error("Server configuration error: Missing Stripe key");
      sentry.captureException(error);
      return createResponse({ error: error.message }, 500);
    }
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      const error = new Error("Server configuration error: Missing database credentials");
      sentry.captureException(error);
      return createResponse({ error: error.message }, 500);
    }

    // Initialize Stripe client
    initializeStripe(stripeSecretKey);

    // For webhook processing, a signature is required
    const signature = req.headers.get("stripe-signature");
    const testModeHeader = req.headers.get("x-test-mode");
    const isTestMode = testModeHeader === "true";
    
    let body;
    let event;
    
    // Special handling for test mode
    if (isTestMode) {
      console.log("Running in test mode - bypassing signature verification");
      sentry.setTag("test_mode", "true");
      
      body = await req.text();
      try {
        event = parseStripeEvent(body);
      } catch (parseError) {
        console.error("Failed to parse request body in test mode:", parseError);
        sentry.captureException(parseError);
        return createResponse({ error: "Invalid JSON format in test mode" }, 400);
      }
    } else {
      // Production mode - require signature
      if (!signature) {
        console.error("Missing stripe-signature header");
        const error = new Error("Missing Stripe signature");
        sentry.captureException(error);
        return createResponse({ error: error.message }, 400);
      }
      
      if (!endpointSecret) {
        console.error("Missing STRIPE_WEBHOOK_SECRET");
        const error = new Error("Server configuration error: Missing webhook secret");
        sentry.captureException(error);
        return createResponse({ error: error.message }, 500);
      }
      
      body = await req.text();
      console.log("Received webhook payload length:", body.length);
      console.log("Payload first 100 chars:", body.substring(0, 100));
      console.log("Stripe signature length:", signature.length);
      console.log("Signature first chars:", signature.substring(0, 20));
      console.log("Webhook secret length:", endpointSecret.length);
      console.log("Webhook secret first/last chars:", 
        endpointSecret.substring(0, 3) + "..." + endpointSecret.slice(-3));
      
      // Manually verify the webhook signature
      try {
        const isValid = await verifyStripeSignature(body, signature, endpointSecret);
        
        if (!isValid) {
          console.error("Webhook signature verification failed");
          console.error("- Signature from header:", signature);
          console.error("- Secret ends with:", endpointSecret.slice(-4));
          console.error("- Payload length:", body.length);
          
          const error = new Error("Webhook Error: Signature verification failed");
          sentry.setContext("verification", {
            signatureLength: signature.length,
            payloadLength: body.length,
            secretFirstChars: endpointSecret.substring(0, 3),
            secretLastChars: endpointSecret.slice(-3)
          });
          sentry.captureException(error);
          
          return createResponse({ error: error.message }, 400);
        }
        
        console.log("Signature verification succeeded");
      } catch (verificationError) {
        console.error("Error during signature verification:", verificationError.message);
        sentry.captureException(verificationError);
        return createResponse({ 
          error: `Webhook Error: Signature verification error: ${verificationError.message}` 
        }, 400);
      }
      
      // Parse the event data
      try {
        event = parseStripeEvent(body);
      } catch (parseError) {
        sentry.captureException(parseError);
        return createResponse({ error: `Invalid JSON format: ${parseError.message}` }, 400);
      }
    }
    
    console.log(`Received Stripe event: ${event.type}`);
    sentry.setTag("event_type", event.type);

    // Initialize Supabase client
    try {
      initializeSupabase(supabaseUrl, supabaseKey);
    } catch (initError) {
      console.error("Failed to initialize Supabase client:", initError);
      sentry.captureException(initError);
      return createResponse({ error: `Database initialization error: ${initError.message}` }, 500);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event.data.object, supabaseUrl, supabaseKey);
    } else {
      console.log("Event type not handled:", event.type);
    }

    // Return a 200 response to acknowledge receipt of the event
    return createResponse({ received: true });
  } catch (error) {
    console.error("Critical error in stripe-webhook function:", error);
    console.error("Stack trace:", error.stack || "No stack trace available");
    
    // Capture the exception in Sentry
    const eventId = sentry.captureException(error);
    console.log(`Error tracked in Sentry with event ID: ${eventId}`);
    
    return createResponse({ 
      error: error.message || "Webhook Error",
      sentryEventId: eventId
    }, 400);
  }
});
