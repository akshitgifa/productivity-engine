/**
 * Centralized Project Service — Handles project-level customizations and reordering.
 */

import { db, ProjectCustomization } from "@/lib/db";
import { processOutbox } from "@/lib/sync";

export const projectService = {
  /**
   * Update project customization (stored in local DB).
   */
  async updateCustomization(projectId: string, updates: Partial<ProjectCustomization>): Promise<void> {
    const existing = await db.getProjectCustomization(projectId);
    const now = new Date().toISOString();
    
    const customization: ProjectCustomization = {
      projectId,
      gridX: existing?.gridX || 0,
      gridY: existing?.gridY || 0,
      gridW: existing?.gridW || 1,
      gridH: existing?.gridH || 1,
      sortOrder: existing?.sortOrder || 0,
      updated_at: now,
      ...existing,
      ...updates,
    };

    await db.setProjectCustomization(customization);
    // Since this table doesn't exist in Supabase yet, we might skip recordAction 
    // or implement it later if multi-device sync is needed for layout.
    // For now, it's local persistence as requested.
  },

  /**
   * Reorder projects in the Master List.
   */
  async reorderProjects(orderedProjectIds: string[]): Promise<void> {
    const now = new Date().toISOString();
    for (let i = 0; i < orderedProjectIds.length; i++) {
      const projectId = orderedProjectIds[i];
      const existing = await db.getProjectCustomization(projectId);
      
      const customization: ProjectCustomization = {
        projectId,
        gridX: existing?.gridX || 0,
        gridY: existing?.gridY || 0,
        gridW: existing?.gridW || 1,
        gridH: existing?.gridH || 1,
        updated_at: now,
        ...existing,
        sortOrder: i + 1,
      };

      await db.setProjectCustomization(customization);
    }
  },

  /**
   * Apply a specific customization to all existing projects.
   */
  async applyCustomizationToAll(baseCustomization: Partial<ProjectCustomization>): Promise<void> {
    const projects = await db.getActiveProjects();
    const now = new Date().toISOString();
    
    for (const p of projects) {
      const existing = await db.getProjectCustomization(p.id);
      const updated: ProjectCustomization = {
        projectId: p.id,
        gridX: existing?.gridX || 0,
        gridY: existing?.gridY || 0,
        gridW: existing?.gridW || 1,
        gridH: existing?.gridH || 1,
        sortOrder: existing?.sortOrder ?? 0,
        theme: baseCustomization.theme ?? existing?.theme,
        customStyles: baseCustomization.customStyles ?? existing?.customStyles,
        updated_at: now,
      };
      await db.setProjectCustomization(updated);
    }
  },

  /**
   * Apply a specific size to all existing projects.
   */
  async applySizeToAll(gridW: number, gridH: number): Promise<void> {
    const projects = await db.getActiveProjects();
    const now = new Date().toISOString();
    
    for (const p of projects) {
      const existing = await db.getProjectCustomization(p.id);
      const updated: ProjectCustomization = {
        projectId: p.id,
        gridX: existing?.gridX || 0,
        gridY: existing?.gridY || 0,
        gridW,
        gridH,
        sortOrder: existing?.sortOrder ?? 0,
        theme: existing?.theme,
        customStyles: existing?.customStyles,
        updated_at: now,
      };
      await db.setProjectCustomization(updated);
    }
  }
};
