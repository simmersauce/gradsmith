
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { GraduationCap } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  role: z.string().min(2, { message: "Role must be at least 2 characters." }),
  institution: z.string().min(2, { message: "Institution must be at least 2 characters." }),
  graduationType: z.string(),
  tone: z.string(),
  keyPoints: z.string(),
  memories: z.string(),
  acknowledgements: z.string(),
  additionalInfo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CreateSpeech = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("1");
  const [userInputs, setUserInputs] = useState<Partial<FormValues>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      role: "",
      institution: "",
      graduationType: "",
      tone: "",
      keyPoints: "",
      memories: "",
      acknowledgements: "",
      additionalInfo: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    console.log(values);
    navigate("/review", { state: { formData: values } });
  };

  const handleNext = async () => {
    const currentTabNumber = parseInt(activeTab);
    if (currentTabNumber < 3) {
      // Collect form values for the current tab
      const values = form.getValues();
      setUserInputs((prev) => ({ ...prev, ...values }));
      
      // Validate the fields for the current tab
      let isValid = true;
      if (currentTabNumber === 1) {
        isValid = await form.trigger(["name", "role", "institution", "graduationType"]);
      } else if (currentTabNumber === 2) {
        isValid = await form.trigger(["tone", "keyPoints"]);
      }
      
      if (isValid) {
        setActiveTab((currentTabNumber + 1).toString());
      }
    }
  };

  const handlePrevious = () => {
    const currentTabNumber = parseInt(activeTab);
    if (currentTabNumber > 1) {
      setActiveTab((currentTabNumber - 1).toString());
    }
  };

  return (
    <div className="container mx-auto py-16 px-4 max-w-4xl">
      <div className="text-center mb-12">
        <GraduationCap className="w-16 h-16 mx-auto text-primary mb-4" />
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Create Your Graduation Speech</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Fill out the form below with details about yourself and your graduation.
          Our AI will craft a personalized speech just for you.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="mb-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-8">
                <TabsTrigger value="1" className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                    {activeTab === "1" ? <CheckCircle2 className="w-5 h-5 text-primary" /> : "1"}
                  </div>
                  <span className="hidden sm:inline">About You</span>
                </TabsTrigger>
                <TabsTrigger value="2" className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                    {parseInt(activeTab) > 1 ? <CheckCircle2 className="w-5 h-5 text-primary" /> : "2"}
                  </div>
                  <span className="hidden sm:inline">Speech Details</span>
                </TabsTrigger>
                <TabsTrigger value="3" className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                    {parseInt(activeTab) > 2 ? <CheckCircle2 className="w-5 h-5 text-primary" /> : "3"}
                  </div>
                  <span className="hidden sm:inline">Final Touches</span>
                </TabsTrigger>
              </TabsList>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TabsContent value="1" className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Student, Class President, Valedictorian" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="institution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Institution Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Name of your school or university" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="graduationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Graduation Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select graduation type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="highSchool">High School</SelectItem>
                            <SelectItem value="college">College/University</SelectItem>
                            <SelectItem value="graduate">Graduate School</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="2" className="space-y-6">
                  <FormField
                    control={form.control}
                    name="tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desired Tone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select the tone for your speech" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="inspirational">Inspirational</SelectItem>
                            <SelectItem value="humorous">Humorous</SelectItem>
                            <SelectItem value="reflective">Reflective</SelectItem>
                            <SelectItem value="formal">Formal</SelectItem>
                            <SelectItem value="mixed">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="keyPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key Points to Include</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What are the main messages you want to convey?"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="memories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Memorable Experiences</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share some memorable experiences from your time at the institution"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="3" className="space-y-6">
                  <FormField
                    control={form.control}
                    name="acknowledgements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acknowledgements</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Who would you like to thank or acknowledge?"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="additionalInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Information (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any other details that might help create your perfect speech"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </motion.div>
            </Tabs>
          </div>

          <div className="flex justify-between mt-8">
            {activeTab !== "1" ? (
              <Button type="button" variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
            ) : (
              <div></div>
            )}

            {activeTab !== "3" ? (
              <Button type="button" onClick={handleNext}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit">
                Review Speech <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreateSpeech;
