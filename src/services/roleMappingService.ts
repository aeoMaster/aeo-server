export interface IRoleMapping {
  cognitoGroup: string;
  appRole: string;
  description?: string;
}

export interface IUserRoles {
  roles: string[];
  groups: string[];
}

class RoleMappingService {
  private roleMappings: IRoleMapping[] = [
    {
      cognitoGroup: "aeo-owners",
      appRole: "owner",
      description: "Full system access and billing management",
    },
    {
      cognitoGroup: "aeo-admins",
      appRole: "admin",
      description: "Company administration and user management",
    },
    {
      cognitoGroup: "aeo-users",
      appRole: "user",
      description: "Standard user access",
    },
    {
      cognitoGroup: "aeo-viewers",
      appRole: "viewer",
      description: "Read-only access",
    },
  ];

  /**
   * Map Cognito groups to application roles
   */
  mapGroupsToRoles(cognitoGroups: string[]): IUserRoles {
    const mappedRoles: string[] = [];

    // Map each Cognito group to application role
    for (const group of cognitoGroups) {
      const mapping = this.roleMappings.find((m) => m.cognitoGroup === group);
      if (mapping && !mappedRoles.includes(mapping.appRole)) {
        mappedRoles.push(mapping.appRole);
      }
    }

    // If no roles are mapped, default to 'user'
    if (mappedRoles.length === 0) {
      mappedRoles.push("user");
    }

    return {
      roles: mappedRoles,
      groups: cognitoGroups,
    };
  }

  /**
   * Get all available role mappings
   */
  getRoleMappings(): IRoleMapping[] {
    return [...this.roleMappings];
  }

  /**
   * Add a new role mapping
   */
  addRoleMapping(mapping: IRoleMapping): void {
    const existingIndex = this.roleMappings.findIndex(
      (m) => m.cognitoGroup === mapping.cognitoGroup
    );

    if (existingIndex >= 0) {
      this.roleMappings[existingIndex] = mapping;
    } else {
      this.roleMappings.push(mapping);
    }
  }

  /**
   * Remove a role mapping
   */
  removeRoleMapping(cognitoGroup: string): boolean {
    const index = this.roleMappings.findIndex(
      (m) => m.cognitoGroup === cognitoGroup
    );
    if (index >= 0) {
      this.roleMappings.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if a user has a specific role
   */
  hasRole(userRoles: string[], requiredRole: string): boolean {
    return userRoles.includes(requiredRole);
  }

  /**
   * Check if a user has any of the required roles
   */
  hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
    return requiredRoles.some((role) => userRoles.includes(role));
  }

  /**
   * Get the highest privilege role from a list of roles
   */
  getHighestRole(userRoles: string[]): string {
    const roleHierarchy = ["owner", "admin", "user", "viewer"];

    for (const role of roleHierarchy) {
      if (userRoles.includes(role)) {
        return role;
      }
    }

    return "user"; // Default fallback
  }

  /**
   * Validate that a role is valid
   */
  isValidRole(role: string): boolean {
    const validRoles = ["owner", "admin", "user", "viewer"];
    return validRoles.includes(role);
  }

  /**
   * Get role permissions (for future use)
   */
  getRolePermissions(role: string): string[] {
    const permissions: { [key: string]: string[] } = {
      owner: [
        "billing:manage",
        "users:manage",
        "company:manage",
        "analysis:create",
        "analysis:read",
        "analysis:update",
        "analysis:delete",
      ],
      admin: [
        "users:manage",
        "company:manage",
        "analysis:create",
        "analysis:read",
        "analysis:update",
        "analysis:delete",
      ],
      user: ["analysis:create", "analysis:read", "analysis:update"],
      viewer: ["analysis:read"],
    };

    return permissions[role] || [];
  }

  /**
   * Check if a user has a specific permission
   */
  hasPermission(userRoles: string[], permission: string): boolean {
    for (const role of userRoles) {
      const rolePermissions = this.getRolePermissions(role);
      if (rolePermissions.includes(permission)) {
        return true;
      }
    }
    return false;
  }
}

export const roleMappingService = new RoleMappingService();
