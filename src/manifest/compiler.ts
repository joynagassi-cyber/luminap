/**
 * Manifest System — compile templates into organization-specific manifests
 *
 * A Manifest is a compiled configuration for an organization:
 * - Which capabilities are enabled
 * - What policies apply
 * - Vocabulary and branding
 */

export interface Manifest {
  id: string;
  orgId: string;
  templateId: string;
  capabilities: string[];
  policies: Record<string, any>;
  vocabulary: Record<string, string>;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
  };
  compiledAt: string;
}

export interface ManifestCompiler {
  compile(template: any, orgData: Record<string, any>): Manifest;
  validate(manifest: Manifest): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ManifestCompilerService implements ManifestCompiler {
  compile(template: any, orgData: Record<string, any>): Manifest {
    return {
      id: `manifest-${orgData.id}-${Date.now()}`,
      orgId: orgData.id,
      templateId: template.id,
      capabilities: template.capabilities ?? [],
      policies: this.mergePolicies(template.policies, orgData.policies),
      vocabulary: this.mergeVocabulary(template.vocabulary, orgData.vocabulary),
      branding: {
        primaryColor:
          orgData.branding?.primaryColor ??
          template.branding?.primaryColor ??
          "#FF6B00",
        secondaryColor:
          orgData.branding?.secondaryColor ??
          template.branding?.secondaryColor ??
          "#1DB954",
        logoUrl: orgData.branding?.logoUrl ?? template.branding?.logoUrl,
      },
      compiledAt: new Date().toISOString(),
    };
  }

  validate(manifest: Manifest): ValidationResult {
    const errors: string[] = [];

    if (!manifest.id) errors.push("Manifest must have an id");
    if (!manifest.orgId) errors.push("Manifest must have an orgId");
    if (!manifest.templateId) errors.push("Manifest must have a templateId");
    if (!Array.isArray(manifest.capabilities))
      errors.push("Manifest must have capabilities array");
    if (!manifest.branding) errors.push("Manifest must have branding");

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private mergePolicies(
    template: Record<string, any>,
    org: Record<string, any>,
  ): Record<string, any> {
    return { ...template, ...org };
  }

  private mergeVocabulary(
    template: Record<string, string>,
    org: Record<string, string>,
  ): Record<string, string> {
    return { ...template, ...org };
  }
}

/** Singleton instance */
export const manifestCompiler = new ManifestCompilerService();
