import { Schema } from 'mongoose';
import { ClsService } from 'nestjs-cls';

export const createTenantScopePlugin = (cls: ClsService) => (schema: Schema) => {
  // If the schema does not have a tenantId path, don't apply the scoping plugin
  if (!schema.path('tenantId')) {
    return;
  }

  const resolveTenantId = (opts?: any): string | null => {
    if (
      opts?.skipTenantScope ||
      cls.get<boolean>('skipTenantScope') ||
      cls.get<string>('userRole') === 'super_admin' ||
      cls.get<boolean>('isSuperAdmin')
    ) {
      return null;
    }
    const tenantId = cls.get<string>('tenantId');
    if (!tenantId) {
      throw new Error('Tenant context missing (fail-closed)');
    }
    return tenantId;
  };

  const QUERY_OPS = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndReplace',
    'updateOne',
    'updateMany',
    'replaceOne',
    'deleteOne',
    'deleteMany',
    'countDocuments',
    'distinct',
  ] as const;

  schema.pre(QUERY_OPS as any, function (this: any) {
    const options = this.getOptions ? this.getOptions() : {};
    const tenantId = resolveTenantId(options);
    if (tenantId) {
      this.setQuery({ ...this.getQuery(), tenantId });

      // Handle upserts to ensure tenantId is set on insertion
      if (options.upsert) {
        const update = this.getUpdate() || {};
        if (!update.$setOnInsert) {
          update.$setOnInsert = {};
        }
        if (!update.$setOnInsert.tenantId && !update.tenantId) {
          update.$setOnInsert.tenantId = tenantId;
        }
        this.setUpdate(update);
      }
    }
  });

  schema.pre('aggregate', function (this: any) {
    const tenantId = resolveTenantId(this.options);
    if (tenantId) {
      const pipeline = this.pipeline();
      // If first stage is $geoNear or $search, insert $match right after it
      if (pipeline.length > 0 && (pipeline[0].$geoNear || pipeline[0].$search)) {
        pipeline.splice(1, 0, { $match: { tenantId } });
      } else {
        pipeline.unshift({ $match: { tenantId } });
      }
    }
  });

  schema.pre('validate', function (this: any) {
    if (this.isNew && !this.tenantId) {
      try {
        const tenantId = resolveTenantId();
        if (tenantId) {
          this.tenantId = tenantId;
        }
      } catch {
        // Validation will handle if required
      }
    }
  });

  schema.pre('save', function (this: any) {
    if (this.isNew && !this.tenantId) {
      try {
        const tenantId = resolveTenantId();
        if (tenantId) {
          this.tenantId = tenantId;
        }
      } catch {
        // Ignore
      }
    }
  });

  (schema as any).pre('insertMany', function (this: any, next: (err?: any) => void, docs: any[]) {

    try {
      const tenantId = resolveTenantId();
      if (tenantId && Array.isArray(docs)) {
        docs.forEach((doc) => {
          if (!doc.tenantId) {
            doc.tenantId = tenantId;
          }
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  });
};
