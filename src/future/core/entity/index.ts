import { DeepPartial } from "../../../common/DeepPartial"
import { AnyDataSource, DataSourceEntity } from "../data-source"
import { AnyDriver } from "../driver"
import { EntityProps, FindReturnType } from "../options/find-options"
import { SelectAll } from "../selection"
import { MoreThanOneElement, NonNever, ValueOf } from "../util"

export type AnyEntity = CoreEntity<
  AnyDriver,
  EntityColumns<AnyDriver>,
  EntityRelations,
  EntityEmbeds<AnyDriver>
>

export type CoreEntity<
  Driver extends AnyDriver,
  Columns extends EntityColumns<Driver>,
  Relations extends EntityRelations,
  Embeds extends EntityEmbeds<Driver>
> = {
  "@type": "Entity"
  driver: Driver
  columns: Columns
  relations: Relations
  embeds: Embeds
}

/**
 * List of named entities.
 */
export type AnyEntityList = {
  [name: string]: AnyEntity
}

export type EntityColumns<Driver extends AnyDriver> = {
  [key: string]: {
    primary?: boolean
    type: keyof Driver["types"]["columnTypes"]
    generated?: boolean
    nullable?: boolean
    array?: boolean
    default?: any
    transform?: {
      from(value: any): any
      to(value: any): any
    }
  }
}

export type EntityRelationTypes =
  | "one-to-one"
  | "many-to-one"
  | "one-to-many"
  | "many-to-many"

export type EntityRelationItem =
  | {
      type: "one-to-many"
      inverse: string
      reference: string
    }
  | {
      type: "many-to-many"
      inverse?: string
      reference: string
    }
  | {
      type: "one-to-one"
      inverse?: string
      reference: string
    }
  | {
      type: "many-to-one"
      inverse?: string
      reference: string
    }

export type EntityRelations = {
  [key: string]: EntityRelationItem
}

export type EntityEmbeds<Driver extends AnyDriver> = {
  [key: string]: AnyEntity
}

/**
 * Extracts entity that was referenced in a given entity relation.
 * For example for ReferencedEntity<Any, User, "avatar"> returns "Photo" entity.
 */
export type ReferencedEntity<
  Source extends AnyDataSource,
  Entity extends AnyEntity,
  Property extends keyof Entity["relations"]
> = Source["driver"]["options"]["entities"][Entity["relations"][Property]["reference"]]

/**
 * Gets a real compile-time type of the column defined in the entity.
 *
 * todo: also need to consider transformers
 */
export type ColumnCompileType<
  Entity extends AnyEntity,
  Property extends keyof Entity["columns"]
> = Entity["columns"][Property]["array"] extends true
  ? Entity["columns"][Property]["nullable"] extends true
    ?
        | Entity["driver"]["types"]["columnTypes"][Entity["columns"][Property]["type"]]["type"][]
        | null
    : Entity["driver"]["types"]["columnTypes"][Entity["columns"][Property]["type"]]["type"]
  : Entity["columns"][Property]["nullable"] extends true
  ?
      | Entity["driver"]["types"]["columnTypes"][Entity["columns"][Property]["type"]]["type"]
      | null
  : Entity["driver"]["types"]["columnTypes"][Entity["columns"][Property]["type"]]["type"]

/**
 * For a given entity returns column names with "primary" set to true.
 *
 * For example for { id: { type: "varchar", primary: true }, name: { "varchar", primary: true}, age: { type: "int" }}
 * This function will return "id" | "name" type.
 *
 * todo: add support for primaries in embeds
 */
export type EntityColumnNamesWithPrimary<Entity extends AnyEntity> = {
  [P in keyof Entity["columns"]]: Entity["columns"][P]["primary"] extends true
    ? P
    : never
}[string & keyof Entity["columns"]]

/**
 * Mixed value map consist of primary columns and their values of the given entity.
 * It is *mixed* because if entity has only one primary column,
 * its type will be directly equal to this primary column type.
 * But if entity has multiple primary columns, its type will be equal to the object consist
 * of these properties and their values.
 *
 * Examples:
 *
 *  - for { id: { type: "varchar", primary: true }, name: { "varchar", primary: true }, age: { type: "int" }}
 *    value will be: { id: string, name: string }
 *
 *  - for { id: { type: "varchar", primary: true }, name: { "varchar" }, age: { type: "int" }}
 *    value will be: string
 *
 * todo: add support for primaries in embeds
 */
export type EntityPrimaryColumnMixedValueMap<
  Entity extends AnyEntity
> = MoreThanOneElement<EntityPrimaryColumnPaths<Entity>> extends never
  ? ColumnCompileType<Entity, EntityPrimaryColumnPaths<Entity>> // todo: it wouldn't work if there is only one primary and it is inside embed
  : EntityPrimaryColumnValueMap<Entity>

/**
 * Returns columns value map with "primary" set to true.
 * Unlike *mixed* it doesn't flatten object if there is only one primary column in the entity.
 *
 * Columns value map is an object where every column name is followed by a computed column type.
 * Examples:
 *
 *  - for { id: { type: "varchar", primary: true }, name: { "varchar", primary: true }, age: { type: "int" } }
 *    value will be: { id: string, name: string }
 *
 *  - for { id: { type: "varchar", primary: true }, name: { "varchar" }, age: { type: "int" } }
 *    value will be: { id: string }
 */
export type EntityPrimaryColumnValueMap<Entity extends AnyEntity> = NonNever<
  {
    [P in keyof EntityProps<Entity>]: P extends keyof Entity["columns"]
      ? Entity["columns"][P]["primary"] extends true
        ? ColumnCompileType<Entity, P>
        : never
      : P extends keyof Entity["embeds"]
      ? EntityPrimaryColumnValueMap<Entity["embeds"][P]>
      : never
  }
>
/**
 * Returns columns value map with "generated" set to true.
 *
 * Columns value map is an object where every column name is followed by a computed column type.
 * Examples:
 *
 *  - for { id: { type: "varchar", primary: true }, name: { "varchar", primary: true }, age: { type: "int" } }
 *    value will be: { id: string, name: string }
 *
 *  - for { id: { type: "varchar", primary: true }, name: { "varchar" }, age: { type: "int" } }
 *    value will be: { id: string }
 */
export type EntityGeneratedColumnValueMap<Entity extends AnyEntity> = NonNever<
  {
    [P in keyof EntityProps<Entity>]: P extends keyof Entity["columns"]
      ? Entity["columns"][P]["generated"] extends true
        ? ColumnCompileType<Entity, P>
        : never
      : P extends keyof Entity["embeds"]
      ? EntityGeneratedColumnValueMap<Entity["embeds"][P]>
      : never
  }
>

/**
 * Returns columns value map with "default" value set.
 * Unlike *mixed* it doesn't flatten object if there is only one primary column in the entity.
 *
 * Columns value map is an object where every column name is followed by a computed column type.
 * Examples:
 *
 *  - for { id: { type: "varchar", primary: true }, name: { "varchar", primary: true }, age: { type: "int" } }
 *    value will be: { id: string, name: string }
 *
 *  - for { id: { type: "varchar", primary: true }, name: { "varchar" }, age: { type: "int" } }
 *    value will be: { id: string }
 */
export type EntityDefaultColumnValueMap<Entity extends AnyEntity> = NonNever<
  {
    [P in keyof EntityProps<Entity>]: P extends keyof Entity["columns"]
      ? Entity["columns"][P]["default"] extends string | number | boolean
        ? ColumnCompileType<Entity, P>
        : never
      : P extends keyof Entity["embeds"]
      ? EntityDefaultColumnValueMap<Entity["embeds"][P]>
      : never
  }
>

/**
 * Extracts all entity columns and columns from its embeds into a single string literal type.
 * Example: for { id, name, profile: { bio, age, photos }} it will return a following type:
 * "id" | "name" | "profile.bio" | "profile.age"
 */
export type EntityColumnPaths<
  Entity extends AnyEntity,
  Parent extends string = "",
  Deepness extends string = "."
> = ValueOf<
  {
    [P in keyof EntityProps<Entity>]?: P extends string &
      keyof Entity["columns"]
      ? `${Parent}${P}`
      : P extends string & keyof Entity["embeds"]
      ? EntityColumnPaths<Entity["embeds"][P], `${Parent}${P}.`, `${Deepness}.`>
      : never
  }
>

/**
 * Extracts all entity primary columns and primary columns from its embeds into a single string literal type.
 * Example: for { id1, name, profile: { id2, bio, age, photos }} it will return a following type:
 * "id" | "profile.id2"
 */
export type EntityPrimaryColumnPaths<
  Entity extends AnyEntity,
  Parent extends string = "",
  Deepness extends string = "."
> = string &
  ValueOf<
    {
      [P in keyof EntityProps<Entity>]?: P extends string &
        keyof Entity["columns"]
        ? Entity["columns"][P]["primary"] extends true
          ? `${Parent}${P}`
          : never
        : P extends string & keyof Entity["embeds"]
        ? EntityPrimaryColumnPaths<
            Entity["embeds"][P],
            `${Parent}${P}.`,
            `${Deepness}.`
          >
        : never
    }
  >

/**
 * Type signature of a given entity.
 */
export type EntityModel<
  Source extends AnyDataSource,
  Entity extends AnyEntity
> = FindReturnType<Source, Entity, {}, false>

/**
 * Partially type signature of a given entity.
 */
export type EntityModelPartial<
  Source extends AnyDataSource,
  Entity extends AnyEntity
> = DeepPartial<FindReturnType<Source, Entity, {}, false>>

/**
 * Entity reference can either be an entity name, either reference to entity declaration.
 */
export type EntityReference<Source extends AnyDataSource> =
  | keyof Source["driver"]["options"]["entities"]
  | DataSourceEntity<Source>

/**
 * Resolves given entity or entity name to the entity.
 * If given value is entity name, finds entity with such name and returns it.
 * If given value is entity itself, simply returns it.
 */
export type EntityPointer<
  Source extends AnyDataSource,
  Reference extends EntityReference<Source>
> = Reference extends keyof Source["driver"]["options"]["entities"]
  ? Source["driver"]["options"]["entities"][Reference]
  : Reference extends DataSourceEntity<Source>
  ? Reference
  : never

/**
 * Merges generated columns, default columns into given partial entity model.
 */
export type EntityModelJustInserted<
  Source extends AnyDataSource,
  Entity extends DataSourceEntity<Source>,
  Model extends EntityModelPartial<Source, Entity>
> = Model &
  FindReturnType<
    Source,
    Entity,
    SelectAll<
      EntityGeneratedColumnValueMap<Entity> &
        EntityDefaultColumnValueMap<Entity>
    >,
    false
  >