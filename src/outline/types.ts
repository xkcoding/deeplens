import { z } from "zod";

const fileEntrySchema = z.object({
  path: z.string(),
  role: z.string(),
  why_included: z.string(),
});

type SubConcept = {
  name: string;
  description: string;
  files: { path: string; role: string; why_included: string }[];
  sub_concepts?: SubConcept[];
};

const subConceptSchema: z.ZodType<SubConcept> = z.lazy(() =>
  z.object({
    name: z.string(),
    description: z.string(),
    files: z.array(fileEntrySchema),
    sub_concepts: z.array(subConceptSchema).optional(),
  }),
);

const domainSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  reasoning: z.string(),
  files: z.array(fileEntrySchema),
  sub_concepts: z.array(subConceptSchema).optional(),
});

export const outlineSchema = z.object({
  project_name: z.string(),
  summary: z.string(),
  detected_stack: z.array(z.string()),
  knowledge_graph: z.array(domainSchema),
  ignored_files: z.array(
    z.object({
      path: z.string(),
      reason: z.string(),
    }),
  ),
});

export type Outline = z.infer<typeof outlineSchema>;
export type Domain = z.infer<typeof domainSchema>;
export type FileEntry = z.infer<typeof fileEntrySchema>;
