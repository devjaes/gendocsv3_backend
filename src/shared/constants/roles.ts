export enum RolesType {
  ADMIN = 'ADMIN',
  TEMP_ADMIN = 'TEMP_ADMIN',
  WRITER = 'WRITER',
  READER = 'READER',
  API = 'API',
}

export enum SpanishRolesType {
  ADMIN = 'Administrador',
  TEMP_ADMIN = 'Administrador Temporal',
  WRITER = 'Escritor',
  READER = 'Lector',
  API = 'Desarrollador',
}

export const RolesThatCanMutate = [
  RolesType.ADMIN,
  RolesType.TEMP_ADMIN,
  RolesType.WRITER,
  RolesType.API,
]

export const RolesThatCanQuery = [
  RolesType.ADMIN,
  RolesType.TEMP_ADMIN,
  RolesType.WRITER,
  RolesType.READER,
  RolesType.API,
]

export const AdminRoles = [RolesType.ADMIN, RolesType.TEMP_ADMIN]
