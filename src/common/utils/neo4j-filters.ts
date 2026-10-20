/**
 * Reusable Neo4j soft-delete filter constants.
 *
 * Usage:
 *   WHERE ${ACTIVE_USER(alias)}
 *   WHERE ${ACTIVE_USER('u')} AND ${ACTIVE_USER('c')}
 */

/** Filter for a single node alias — excludes soft-deleted nodes */
export const ACTIVE_USER = (alias: string = 'u') =>
  `(${alias}.is_deleted IS NULL OR ${alias}.is_deleted = false)`;

/** Shorthand for the most common case (alias = 'u') */
export const ACTIVE_USER_FILTER = `(u.is_deleted IS NULL OR u.is_deleted = false)`;

/** Shorthand for opportunity nodes */
export const ACTIVE_OPP_FILTER = `(o.is_deleted IS NULL OR o.is_deleted = false)`;

/**
 * MongoDB query fragment for active (non-deleted) users.
 * Use as a spread inside Mongoose filter objects:
 *   await model.findOne({ email, ...MONGO_ACTIVE_FILTER })
 *
 * Note: Uses { is_deleted: false } (equality) rather than { $ne: true }
 * because MongoDB Atlas does not support $ne in partialFilterExpression.
 * This is safe because all new accounts are created with is_deleted: false.
 */
export const MONGO_ACTIVE_FILTER = { is_deleted: false } as const;
