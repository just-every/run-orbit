import { z } from "zod";

export const productConfigSchema = z.object({
  public: z.object({
    name: z.string().trim().min(1),
    description: z.string().trim().min(1),
    imageUrl: z.string().regex(/^\/(?!\/)[a-zA-Z0-9._/-]*$/, "imageUrl must be a same-origin local asset path").nullable(),
    showPoweredByCredit: z.boolean()
  }),
  demo: z.object({ enabled: z.boolean() })
});

export type ProductConfig = z.infer<typeof productConfigSchema>;

export function parseProductConfig(config: unknown): ProductConfig {
  return productConfigSchema.parse(config);
}
