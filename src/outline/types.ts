import { z } from "zod";

const fileEntrySchema = z.object({
  path: z.string().min(1),
  role: z.string().min(1),
  why_included: z.string().min(1, "why_included must explain why this file matters for the domain"),
});

type SubConcept = {
  name: string;
  description: string;
  files: { path: string; role: string; why_included: string }[];
  sub_concepts?: SubConcept[];
};

const subConceptSchema: z.ZodType<SubConcept> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    files: z.array(fileEntrySchema).min(1, "each sub_concept must list the files it covers"),
    sub_concepts: z.array(subConceptSchema).optional(),
  }),
);

const domainSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  reasoning: z.string().min(1, "reasoning must explain why these files form a coherent domain"),
  files: z.array(fileEntrySchema).min(1),
  sub_concepts: z.array(subConceptSchema).min(1, "each domain must have at least 1 sub_concept").optional(),
});

const overviewSchema = z.object({
  architecture: z.string().min(1),
  tech_stack_roles: z.array(
    z.object({
      name: z.string().min(1),
      role: z.string().min(1),
    }),
  ),
  key_flows: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
  project_structure: z.string().min(1),
});

export const outlineSchema = z.object({
  project_name: z.string(),
  summary: z.string(),
  detected_stack: z.array(z.string()),
  overview: overviewSchema.optional(),
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
