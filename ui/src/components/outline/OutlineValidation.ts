import { z } from "zod";

export const SubConceptSchema = z.object({
  id: z.string().min(1, "Sub-concept id is required"),
  name: z.string().min(1, "Sub-concept name is required"),
  description: z.string().optional(),
});

export const DomainFileSchema = z.object({
  path: z.string().min(1),
  role: z.string().min(1),
});

export const DomainSchema = z.object({
  id: z.string().min(1, "Domain id is required"),
  title: z.string().min(1, "Domain title is required"),
  description: z.string().min(1, "Domain description is required"),
  files: z.array(DomainFileSchema).optional().default([]),
  sub_concepts: z.array(SubConceptSchema).optional().default([]),
});

export const OutlineSchema = z
  .object({
    project_name: z.string().min(1),
    summary: z.string().min(1),
    detected_stack: z.array(z.string()).optional().default([]),
    knowledge_graph: z.array(DomainSchema).min(1, "At least one domain is required"),
    ignored_files: z
      .array(z.object({ path: z.string(), reason: z.string() }))
      .optional()
      .default([]),
  })
  .refine(
    (data) => {
      const ids = data.knowledge_graph.map((d) => d.id);
      return new Set(ids).size === ids.length;
    },
    { message: "Domain ids must be unique", path: ["knowledge_graph"] },
  );

export type OutlineData = z.infer<typeof OutlineSchema>;
export type DomainData = z.infer<typeof DomainSchema>;
export type SubConceptData = z.infer<typeof SubConceptSchema>;

export interface ValidationError {
  domainId?: string;
  subConceptId?: string;
  message: string;
}

export function validateOutline(data: unknown): {
  success: boolean;
  data?: OutlineData;
  errors: ValidationError[];
} {
  const result = OutlineSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }

  // Use the raw data to resolve array indices to actual domain/sub_concept IDs
  const raw = data as Record<string, unknown> | undefined;
  const kg = Array.isArray((raw as Record<string, unknown>)?.knowledge_graph)
    ? ((raw as Record<string, unknown>).knowledge_graph as Array<Record<string, unknown>>)
    : [];

  const errors: ValidationError[] = result.error.issues.map((issue) => {
    const pathStr = issue.path.join(".");
    const domainMatch = pathStr.match(/knowledge_graph\.(\d+)/);
    const subMatch = pathStr.match(/sub_concepts\.(\d+)/);

    let domainId: string | undefined;
    if (domainMatch) {
      const idx = Number(domainMatch[1]);
      domainId = (kg[idx]?.id as string) ?? undefined;
    }

    let subConceptId: string | undefined;
    if (domainMatch && subMatch) {
      const dIdx = Number(domainMatch[1]);
      const sIdx = Number(subMatch[1]);
      const subs = kg[dIdx]?.sub_concepts as Array<Record<string, unknown>> | undefined;
      subConceptId = (subs?.[sIdx]?.id as string) ?? undefined;
    }

    return { domainId, subConceptId, message: issue.message };
  });

  return { success: false, errors };
}
