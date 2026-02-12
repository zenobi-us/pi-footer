import {
  Any,
  Array as TypeArray,
  Boolean as TypeBoolean,
  Literal,
  Object as TypeObject,
  Optional,
  String as TypeString,
  Union as TypeUnion,
  Static,
} from 'typebox';
import { Check, Parse } from 'typebox/value';

const TemplateItemAlignmentSchema = TypeUnion([Literal('left'), Literal('right')], {
  $id: 'TemplateItemAlignment',
});
export type TemplateItemAlignment = Static<typeof TemplateItemAlignmentSchema>;

const TemplateItemSchema = TypeObject(
  {
    items: TypeArray(Any()),
    template: Optional(TypeUnion([TypeString(), TypeArray(TypeString())])),
    separator: Optional(TypeString()),
    flexGrow: Optional(TypeBoolean()),
    align: Optional(TemplateItemAlignmentSchema),
  },
  {
    $id: 'TemplateItem',
    additionalProperties: false,
  }
);

export type TemplateItem = Static<typeof TemplateItemSchema>;

const TemplateRowSchema = TypeArray(TemplateItemSchema, {
  $id: 'TemplateRow',
});

export type TemplateRow = Static<typeof TemplateRowSchema>;

const TemplateSchema = TypeArray(TemplateRowSchema, {
  $id: 'Template',
});

export type Template = Static<typeof TemplateSchema>;

const UnresolvedTemplateRowSchema = TypeUnion(
  [TypeString(), TemplateItemSchema, TypeArray(TypeUnion([TypeString(), TemplateItemSchema]))],
  {
    $id: 'UnresolvedTemplateRow',
  }
);

export type UnresolvedTemplateRow = Static<typeof UnresolvedTemplateRowSchema>;

const UnresolvedTemplateSchema = TypeArray(UnresolvedTemplateRowSchema, {
  $id: 'UnresolvedTemplate',
});

export type UnresolvedTemplate = Static<typeof UnresolvedTemplateSchema>;

export const ConfigSchema = TypeObject(
  {
    template: UnresolvedTemplateSchema,
  },
  {
    $id: 'Config',
    additionalProperties: true,
  }
);

export type Config = Static<typeof ConfigSchema>;

export const ResolvedConfigSchema = TypeObject(
  {
    template: TemplateSchema,
  },
  {
    $id: 'ResolvedConfig',
    additionalProperties: false,
  }
);

export type ResolvedConfig = Static<typeof ResolvedConfigSchema>;

function isTemplateItemLike(value: unknown): value is TemplateItem {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return 'items' in value || 'template' in value;
}

function normalizeTemplateItem(value: string | TemplateItem): TemplateItem {
  if (typeof value === 'string') {
    return { items: [value] };
  }

  const templateAlias = value.template;
  const sourceItems = Array.isArray(value.items)
    ? value.items
    : typeof templateAlias === 'string'
      ? [templateAlias]
      : Array.isArray(templateAlias)
        ? templateAlias
        : [];

  const items = sourceItems.map((item) => {
    if (typeof item === 'string') {
      return item;
    }

    if (isTemplateItemLike(item)) {
      return normalizeTemplateItem(item);
    }

    throw new Error('Invalid template item entry: expected string or template item object');
  });

  const next: TemplateItem = {
    items,
  };

  if (value.separator !== undefined) {
    next.separator = value.separator;
  }

  if (value.flexGrow !== undefined) {
    next.flexGrow = value.flexGrow;
  }

  if (value.align !== undefined) {
    next.align = value.align;
  }

  return next;
}

/*
 * Supported template row input variants (canonical output pattern):
 *
 * After normalization, all of these input shapes produce the same row shape:
 *
 * [
 *   '',                       // -> [{ items: [''] }]
 *   ['', ''],                 // -> [{ items: ['', ''] }]
 *   { items: [''] },          // -> [{ items: [''] }]
 *   [{ items: ['', ''] }],    // -> [{ items: ['', ''] }]
 * ]
 *
 * The result is always `Template` (`TemplateRow[]`), where every row is an
 * array of `TemplateItem` objects with explicit `items` arrays.
 */

function normalizeTemplateRow(row: UnresolvedTemplateRow): TemplateRow {
  if (typeof row === 'string') {
    return [normalizeTemplateItem(row)];
  }

  if (Check(TemplateItemSchema, row)) {
    return [row];
  }

  const allStrings = row.every((item) => typeof item === 'string');
  if (allStrings) {
    return [
      {
        items: row,
      },
    ];
  }

  return row.map((item) => normalizeTemplateItem(item));
}
function normalizeTemplate(rows: UnresolvedTemplate): Template {
  return rows.map((row) => normalizeTemplateRow(row));
}

export function normalizeConfig(value: unknown) {
  const parsed = Parse(ConfigSchema, value);
  const template = normalizeTemplate(parsed.template);

  return Parse(ResolvedConfigSchema, {
    ...parsed,
    template,
  });
}
