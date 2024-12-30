import { Injectable } from '@nestjs/common'
import { UserEntity } from '../../users/entities/users.entity'
import { DegreeBadRequestError } from '../../degrees/errors/degree-bad-request'
import { PERMISSIONS, SPANISH_FIELDS } from '../constants/permissions'
import { SpanishRolesType } from '../constants/roles'
import { isValid } from 'date-fns'
import { isObject } from '../utils/object'

@Injectable()
export class InputFieldsValidator {
  public static async validateFieldsUpdate<UpdateDtoEntity, Entity>(
    updateDTO: UpdateDtoEntity,
    entity: Entity,
    userId: number,
  ): Promise<void> {
    const user = await UserEntity.findOne({ where: { id: userId } })

    if (userId && !user) {
      throw new DegreeBadRequestError(`El usuario ${userId} no existe`)
    }

    const entitieFields = Object.keys(entity)
    const updateFields = Object.keys(updateDTO)

    const mutatedFields = InputFieldsValidator.getMutatedFields(
      updateFields,
      entitieFields,
      entity,
      updateDTO,
    )

    const canMutateFields =
      PERMISSIONS[user.role][entity.constructor.name].UPDATE

    if (canMutateFields.includes('*')) {
      return
    }

    InputFieldsValidator.checkFields(
      mutatedFields,
      canMutateFields,
      user,
      entity.constructor.name,
    )
  }

  private static checkFields(
    mutatedFields: string[],
    canMutateFields: string[],
    user: UserEntity,
    entityPrototypeName: string,
  ) {
    for (const field of mutatedFields) {
      if (!canMutateFields.includes(field)) {
        throw new DegreeBadRequestError(
          `El campo ${
            SPANISH_FIELDS[entityPrototypeName][field]
          } no puede ser modificado por un ${SpanishRolesType[user.role]}`,
        )
      }
    }
  }

  private static getMutatedFields<UpdateDtoEntity, Entity>(
    updateFields: string[],
    entitieFields: string[],
    entity: Entity,
    updateDTO: UpdateDtoEntity,
  ) {
    return updateFields.filter((field) => {
      const matchedField = entitieFields.find((entitieField) => {
        if (field.slice(field.length - 2) === 'Id') {
          const fieldWithoutId = field.slice(0, field.length - 2)
          return fieldWithoutId
            .toLowerCase()
            .includes(entitieField.toLowerCase())
        }

        return field.toLowerCase().includes(entitieField.toLowerCase())
      })

      if (!matchedField || matchedField == null) {
        return false
      }

      if (isObject(entity[matchedField])) {
        if (entity[matchedField].id) {
          return entity[matchedField].id !== updateDTO[field]
        }

        return (
          JSON.stringify(entity[matchedField]) !==
          JSON.stringify(updateDTO[field])
        )
      }

      if (Array.isArray(entity[matchedField]) && entity[matchedField].length) {
        return (
          JSON.stringify(entity[matchedField]) !==
          JSON.stringify(updateDTO[field])
        )
      }

      if (isValid(entity[matchedField])) {
        return new Date(entity[matchedField]) !== new Date(updateDTO[field])
      }

      return entity[matchedField] !== updateDTO[field]
    })
  }
}
