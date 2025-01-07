import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { CreateVariableDto } from './dto/create-variable.dto'
import { UpdateVariableDto } from './dto/update-variable.dto'
import { DocumentEntity } from '../documents/entities/document.entity'
import { DEFAULT_VARIABLE } from '../shared/enums/default-variable'
import {
  formatDate,
  formatDateText,
  formatHourMinutesText,
  formatMonthName,
  formatWeekDayName,
} from '../shared/utils/date'
import {
  getFullName,
  formatNumeration,
  concatNames,
  getFullNameWithTitles,
  capitalizeEachWord,
  getThirdLevelDegree,
  getFourthLevelDegree,
  getFullNameWithFourthLevelDegreeFirst,
} from '../shared/utils/string'
import { DocumentFunctionaryEntity } from '../documents/entities/document-functionary.entity'
import { DataSource, Repository } from 'typeorm'
import { PositionEntity } from '../positions/entities/position.entity'
import { VariableEntity } from './entities/variable.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { ApiResponseDto } from '../shared/dtos/api-response.dto'
import { DegreeCertificateEntity } from '../degree-certificates/entities/degree-certificate.entity'
import { GENDER } from '../shared/enums/genders'
import {
  DEGREE_ATTENDANCE_ROLES,
  DEGREE_CERTIFICATE_VARIABLES,
  GENDER_DESIGNATION,
  GENDER_DESIGNATION_VARIABLE,
  MEMBERS_DESIGNATION,
  STUDENT_DEGREE_CERTIFICATE,
} from '../shared/enums/degree-certificates'
import { transformNumberToWords } from '../shared/utils/number'
import { StudentEntity } from '../students/entities/student.entity'
import { DegreeCertificateAttendanceEntity } from '../degree-certificate-attendance/entities/degree-certificate-attendance.entity'
import { ADJECTIVES } from '../shared/enums/adjectives'
import { CouncilEntity } from '../councils/entities/council.entity'
import { CouncilAttendanceEntity } from '../councils/entities/council-attendance.entity'
import { FunctionaryEntity } from '../functionaries/entities/functionary.entity'
import { DegreeCertificateAttendanceBadRequestError } from '../degree-certificate-attendance/errors/degree-certificate-attendance-bad-request'

@Injectable()
export class VariablesService {
  private readonly logger = new Logger(VariablesService.name)
  constructor(
    @InjectRepository(VariableEntity)
    private readonly variableRepository: Repository<VariableEntity>,
    private dataSource: DataSource,
  ) {}

  async showVariables() {
    const positions = await this.dataSource.manager
      .getRepository(PositionEntity)
      .find({
        relationLoadStrategy: 'join',
        relations: {
          functionary: true,
        },
      })

    const positionsVariables = positions.map((position) => ({
      variable: position.variable,
      example: getFullName(position.functionary),
    }))

    const studentVariables = [
      {
        variable: DEFAULT_VARIABLE.ESTUDIANTE,
        example: 'Juan Pérez',
      },
      {
        variable: DEFAULT_VARIABLE.ESTUDIANTEUP,
        example: 'JUAN PÉREZ',
      },
      {
        variable: DEFAULT_VARIABLE.CEDULA,
        example: '1234567890',
      },
      {
        variable: DEFAULT_VARIABLE.MATRICULA,
        example: '0001',
      },
      {
        variable: DEFAULT_VARIABLE.FOLIO,
        example: '0001',
      },
      {
        variable: DEFAULT_VARIABLE.TELEFONO,
        example: '032382323',
      },
      {
        variable: DEFAULT_VARIABLE.CELULAR,
        example: '0999988888',
      },
      {
        variable: DEFAULT_VARIABLE.CORREO,
        example: 'estudiante@gmail.com',
      },
      {
        variable: DEFAULT_VARIABLE.CORREOUTA,
        example: 'estudiante@uta.edu.ec',
      },
      {
        variable: DEFAULT_VARIABLE.NOMBRECARRERA,
        example: 'Ingeniería en Sistemas',
      },
      {
        variable: DEFAULT_VARIABLE.NOMBRECARRERAUP,
        example: 'INGENIERÍA EN SISTEMAS',
      },
      {
        variable: DEFAULT_VARIABLE.ESTUDIANTE_TITULO,
        example: 'Ingeniero en Sistemas',
      },
      {
        variable: DEFAULT_VARIABLE.ESTUDIANTE_FECHA_NACIMIENTO,
        example: '16 de julio de 1990',
      },
      {
        variable: DEFAULT_VARIABLE.ESTUDIANTE_TITULO_UPPER,
        example: 'INGENIERO EN SISTEMAS',
      },
      {
        variable: DEFAULT_VARIABLE.ESTUDIANTE_TEMA,
        example: 'Tesis de analisis',
      },
      {
        variable: DEFAULT_VARIABLE.ESTUDIANTE_TITULO_BACHILLER,
        example: 'Bachiller en Ciencias',
      },
      {
        variable: DEFAULT_VARIABLE.ESTUDIANTE_FECHA_INICIO_ESTUDIOS_FECHAUP,
        example:
          '16 de julio de 2010, (cambio de universidad?) -> 28 de febrero de 2019 en la Escuela Superior Politécnica de Chimborazo ESPOCH, realizó cambio de Universidad según Resolución 1539-P-CD-FISEI-UTA-2019 e ingresa el 24 de marzo de 2019 ',
      },
      {
        variable: DEFAULT_VARIABLE.ESTUDIANTE_FECHA_FIN_ESTUDIOS_FECHAUP,
        example: '16 de julio de 2015',
      },
      {
        variable: DEFAULT_VARIABLE.COORDINADOR,
        example: 'Ing. Juan Pérez',
      },
      {
        variable: DEFAULT_VARIABLE.CANTON,
        example: 'Ambato',
      },
      {
        variable: DEFAULT_VARIABLE.PROVINCE,
        example: 'Tungurahua',
      },
    ]

    const functionariesVariables = [
      {
        variable: DEFAULT_VARIABLE.DOCENTE_N.replace('$i', '0'),
        example: 'Ing. Juan Pérez Msc.',
      },
      {
        variable: DEFAULT_VARIABLE.DOCENTE_N.replace('$i', '1'),
        example: 'Ing. Elisa Pérez Msc',
      },
      {
        variable: DEFAULT_VARIABLE.DOCENTE_N_SIN_TITU.replace('$i', '1'),
        example: 'Elisa Pérez',
      },
      {
        variable: DEFAULT_VARIABLE.DOCENTE_CARGO_N.replace('$i', '0'),
        example: 'Coordinador de carrera',
      },
      {
        variable: DEFAULT_VARIABLE.DOCENTE_CARGO_N.replace('$i', '1'),
        example: 'Secretaria de carrera',
      },
    ]
    const councilVariables = [
      {
        variable: DEFAULT_VARIABLE.FECHA,
        example: '16 de julio de 2021',
      },
      {
        variable: DEFAULT_VARIABLE.RESPONSABLE,
        example: 'Ing. Juan Pérez',
      },
      {
        variable: DEFAULT_VARIABLE.RESPONSABLE_SIN_TITU,
        example: 'Juan Pérez',
      },
      {
        variable: DEFAULT_VARIABLE.NUMACT,
        example: '001',
      },
      {
        variable: DEFAULT_VARIABLE.FECHAUP,
        example: '16 DE JULIO DE 2021',
      },
      {
        variable: DEFAULT_VARIABLE.SESIONUP,
        example: 'ORDINARIA',
      },
      {
        variable: DEFAULT_VARIABLE.SESION,
        example: 'ordinaria',
      },
      {
        variable: DEFAULT_VARIABLE.Y,
        example: '2022',
      },
      {
        variable: DEFAULT_VARIABLE.DIASEM_T,
        example: 'viernes',
      },
      {
        variable: DEFAULT_VARIABLE.NUMMES_T_U,
        example: 'JULIO',
      },
      {
        variable: DEFAULT_VARIABLE.MES_T_L,
        example: 'julio',
      },
      {
        variable: DEFAULT_VARIABLE.NUMDIA_T,
        example: 'dieciséis',
      },
      {
        variable: DEFAULT_VARIABLE.NUMANIO_T,
        example: 'dos mil veintiuno',
      },
      {
        variable: DEFAULT_VARIABLE.NUMANIO_T_L,
        example: 'dos mil veintiuno',
      },
      {
        variable: DEFAULT_VARIABLE.DIAS_T,
        example: 'dieciséis días',
      },
      {
        variable: DEFAULT_VARIABLE.HORA_T_L,
        example: 'dieciséis',
      },
      {
        variable: DEFAULT_VARIABLE.MINUTOS_T_L,
        example: 'dieciséis',
      },
      {
        variable: DEFAULT_VARIABLE.ASISTIERON,
        example: 'Ing. Juan Pérez',
      },
      {
        variable: DEFAULT_VARIABLE.NO_ASISTIERON,
        example: 'Ing. Juan Pérez',
      },
    ]
    const documentVariables = [
      {
        variable: DEFAULT_VARIABLE.CREADOPOR,
        example: 'Usuario admin',
      },
      {
        variable: DEFAULT_VARIABLE.NUMDOC,
        example: '001',
      },
      {
        variable: DEFAULT_VARIABLE.YEAR,
        example: '2022',
      },
    ]
    const degreeCertificateVariables = [
      {
        variable: GENDER_DESIGNATION_VARIABLE(0),
        example: 'el señor/ la señorita',
      },
      {
        variable: GENDER_DESIGNATION_VARIABLE(1),
        example: 'portador/ portadora',
      },
      {
        variable: GENDER_DESIGNATION_VARIABLE(2),
        example: 'El mencionado señor/ La mencionada señorita',
      },
      {
        variable: GENDER_DESIGNATION_VARIABLE(3),
        example: 'El mencionado/ La mencionada',
      },
      {
        variable: GENDER_DESIGNATION_VARIABLE(4),
        example: 'El señor/ La señorita',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.DEGREE_CERTIFICATE_PRESIDENT,
        example: 'Ing. Juan Pérez',
      },
      {
        variable:
          DEGREE_CERTIFICATE_VARIABLES.DEGREE_CERTIFICATE_PRESIDENT_DOC_ASSIGNED,
        example: 'Presidente',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.MEMBERS_DEGREE_CERTIFICATE,
        example:
          'Ing. Juan Pérez principalizado mediante resolución 001 de fecha 16 de julio de 2021, Ing. Juan Pérez principalizado mediante resolución 001 de fecha 16 de julio de 2021',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.FIRST_MEMBER_DEGREE_CERTIFICATE,
        example: 'Ing. Juan Pérez',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.SECOND_MEMBER_DEGREE_CERTIFICATE,
        example: 'Ing. Juan Pérez',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.FIRST_MEMBER_WITHOUTH_DEGREES,
        example: 'Juan Pérez',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.SECOND_MEMBER_WITHOUTH_DEGREES,
        example: 'Carlos Lopez',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.FIRST_MEMBER_THIRDL_DEGREE_ABR,
        example: 'Ing.',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.SECOND_MEMBER_THIRDL_DEGREE_ABR,
        example: 'Lic.',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.FIRST_MEMBER_FOURTHL_DEGREE,
        example: 'PhD.',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.SECOND_MEMBER_FOURTHL_DEGREE,
        example: 'MSc.',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.CREATED_BY,
        example: 'Usuario admin',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.DECANA,
        example: 'Ing. Juan Pérez',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.IC_UNIT_PRESIDENT,
        example: 'Ing. Juan Pérez',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.DEGREE_CERTIFICATE_TYPE,
        example: 'ACTA DE GRADO',
      },
      {
        variable: DEGREE_CERTIFICATE_VARIABLES.DEGREE_CERTIFICATE_TOPIC,
        example: 'Tesis de analisis',
      },
      {
        variable: STUDENT_DEGREE_CERTIFICATE.CREDITS_TEXT,
        example: 'cien',
      },
      {
        variable: STUDENT_DEGREE_CERTIFICATE.CREDITS_NUMBER,
        example: '100',
      },
      {
        variable: STUDENT_DEGREE_CERTIFICATE.INTERNSHIP_HOURS,
        example: '100',
      },
      {
        variable: STUDENT_DEGREE_CERTIFICATE.VINCULATION_HOURS,
        example: '100',
      },
      {
        variable: STUDENT_DEGREE_CERTIFICATE.VINCULATION_HOURS_TEXT,
        example: 'cien',
      },
      {
        variable: STUDENT_DEGREE_CERTIFICATE.INTERNSHIP_HOURS_TEXT,
        example: 'cien',
      },
      {
        variable: STUDENT_DEGREE_CERTIFICATE.DEGREE_CERTIFICATE_STATUS,
        example: 'GRADUADO',
      },
    ]

    return new ApiResponseDto('Variables encontradas con éxito', {
      Cargos: positionsVariables,
      Estudiantes: studentVariables,
      Docentes: functionariesVariables,
      Consejos: councilVariables,
      Documentos: documentVariables,
      Actas_de_grado: degreeCertificateVariables,
    })
  }

  async create(createVariableDto: CreateVariableDto) {
    try {
      const alreadyExists = await this.variableRepository.findOne({
        where: { variable: createVariableDto.variable },
      })

      if (alreadyExists) {
        throw new BadRequestException('Variable already exists')
      }

      const variable = this.variableRepository.create(createVariableDto)

      if (!variable) {
        throw new BadRequestException('Variable not created')
      }

      const newVariable = await this.variableRepository.save(variable)

      return new ApiResponseDto('Variable creada con éxito', newVariable)
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  async findAll() {
    try {
      const variables = await this.variableRepository.find()

      return new ApiResponseDto('Variables encontradas con éxito', variables)
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  async findOne(id: number) {
    try {
      const variable = await this.variableRepository.findOne({ where: { id } })

      if (!variable) {
        throw new BadRequestException('Variable not found')
      }

      return new ApiResponseDto('Variable encontrada con éxito', variable)
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  async update(id: number, updateVariableDto: UpdateVariableDto) {
    try {
      const alreadyExists = await this.variableRepository.findOne({
        where: { variable: updateVariableDto.variable },
      })

      if (alreadyExists) {
        throw new BadRequestException('Variable already exists')
      }

      const variable = await this.variableRepository.save({
        id,
        ...updateVariableDto,
      })

      return new ApiResponseDto('Variable actualizada con éxito', variable)
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  async remove(id: number) {
    try {
      await this.variableRepository.delete(id)

      return new ApiResponseDto('Variable eliminada con éxito', {
        success: true,
      })
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  async getGeneralVariables(
    document: DocumentEntity | DegreeCertificateEntity,
  ) {
    try {
      const variables = {
        [DEFAULT_VARIABLE.CREADOPOR]: `${document.user.firstName} ${document.user.firstLastName}`,
        [DEFAULT_VARIABLE.NUMDOC]: formatNumeration(
          document instanceof DocumentEntity
            ? document.numerationDocument.number
            : (document as DegreeCertificateEntity).number,
        ),
        [DEFAULT_VARIABLE.YEAR]: document.createdAt.getFullYear().toString(),
        [DEFAULT_VARIABLE.Y]: document.createdAt.getFullYear().toString(),
      }

      return new ApiResponseDto(
        'Variables generales encontradas con éxito',
        variables,
      )
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  async getCouncilVariables(document: DocumentEntity) {
    try {
      const functionary = document.numerationDocument.council.attendance.find(
        (attendance) => attendance.positionOrder === 1,
      ).functionary

      if (!functionary) {
        throw new BadRequestException('El consejo no tiene presidente asignado')
      }

      const variables = {
        [DEFAULT_VARIABLE.FECHA]: formatDate(
          document.numerationDocument.council.date,
        ),
        [DEFAULT_VARIABLE.FECHAUP]: formatDateText(
          document.numerationDocument.council.date,
        ),
        [DEFAULT_VARIABLE.SESION]:
          document.numerationDocument.council.type.toLowerCase(),
        [DEFAULT_VARIABLE.SESIONUP]:
          document.numerationDocument.council.type.toUpperCase(),
        [DEFAULT_VARIABLE.RESPONSABLE]: `${getFullNameWithTitles(functionary)}`,
        [DEFAULT_VARIABLE.RESPONSABLE_SIN_TITU]: `${getFullName(functionary)}`,
      }

      return new ApiResponseDto(
        'Variables de consejo encontradas con éxito',
        variables,
      )
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  getGenderDesingationVariables(student: StudentEntity) {
    const genderVariations = {}

    GENDER_DESIGNATION.map(
      (genderDesignation, index) =>
        // eslint-disable-next-line no-extra-parens
        (genderVariations[GENDER_DESIGNATION_VARIABLE(index)] =
          genderDesignation[student.gender]),
    )

    return genderVariations
  }

  getStudentDegreeCertificateVariables(document: DegreeCertificateEntity) {
    const degree =
      document.student.gender === GENDER.FEMALE
        ? document.student.career.womenDegree
        : document.student.career.menDegree

    const fullName = getFullName(document.student)

    const career = document.student.career.name

    const genderVariations = this.getGenderDesingationVariables(
      document.student,
    )

    const coordinator = {
      ...document.student.career.coordinator,
    } as FunctionaryEntity

    let startStudiesDateVariable: string = document.student.startStudiesDate
      ? formatDateText(document.student.startStudiesDate)
      : '*NO POSEE FECHA DE INICIO DE ESTUDIOS'

    if (document.changeUniversityResolution) {
      const otherUniversity = document.changeUniversityName
      const otherUniversityResolution = document.changeUniversityResolution
      const otherUniversityDate = formatDateText(document.changeUniversityDate)

      const addedText = `${otherUniversityDate} en la ${otherUniversity}, realizó cambio de Universidad según Resolución ${otherUniversityResolution} e ingresa el `

      startStudiesDateVariable = addedText.concat(startStudiesDateVariable)
    }

    const bachelorDegree = `${
      document.student.bachelorDegree ?? '**NO POSEE TÍTULO DE BACHILLER'
    } en ${
      document.student.highSchoolName
        ? `${
            document.student.highSchoolName.toLowerCase().includes('instituto')
              ? 'el'
              : 'la'
          } ${capitalizeEachWord(document.student.highSchoolName)}`
        : '**NO POSEE NOMBRE DE INSTITUCIÓN DE EDUCACIÓN SECUNDARIA'
    }`

    const variables = {
      ...genderVariations,
      [DEFAULT_VARIABLE.ESTUDIANTE]: fullName,
      [DEFAULT_VARIABLE.ESTUDIANTEUP]: fullName.toUpperCase(),
      [DEFAULT_VARIABLE.CEDULA]: document.student.dni,
      [DEFAULT_VARIABLE.MATRICULA]: document.student.registration,
      [DEFAULT_VARIABLE.FOLIO]: document.student.folio,
      [DEFAULT_VARIABLE.TELEFONO]: document.student.regularPhoneNumber,
      [DEFAULT_VARIABLE.CELULAR]: document.student.phoneNumber,
      [DEFAULT_VARIABLE.CORREO]: document.student.personalEmail,
      [DEFAULT_VARIABLE.CORREOUTA]: document.student.outlookEmail,
      [DEFAULT_VARIABLE.NOMBRECARRERA]: career,
      [DEFAULT_VARIABLE.NOMBRECARRERAUP]: career.toUpperCase(),
      [DEFAULT_VARIABLE.ESTUDIANTE_TITULO]: degree,
      [DEFAULT_VARIABLE.ESTUDIANTE_FECHA_NACIMIENTO]: formatDateText(
        document.student.birthdate,
      ),
      [DEFAULT_VARIABLE.ESTUDIANTE_TITULO_UPPER]: degree.toUpperCase(),
      [DEFAULT_VARIABLE.ESTUDIANTE_TEMA]:
        (document as DegreeCertificateEntity).topic ?? '*NO POSEE TEMA',
      [DEFAULT_VARIABLE.ESTUDIANTE_TITULO_BACHILLER]: bachelorDegree,
      [DEFAULT_VARIABLE.ESTUDIANTE_FECHA_INICIO_ESTUDIOS_FECHAUP]:
        startStudiesDateVariable,
      [DEFAULT_VARIABLE.ESTUDIANTE_FECHA_FIN_ESTUDIOS_FECHAUP]: document.student
        .endStudiesDate
        ? formatDateText(document.student.endStudiesDate)
        : '*NO POSEE FECHA DE FIN DE ESTUDIOS',
      [DEFAULT_VARIABLE.COORDINADOR]: getFullName(coordinator),
      [DEFAULT_VARIABLE.CANTON]: document.student.canton.name,
      [DEFAULT_VARIABLE.PROVINCE]: document.student.canton.province.name,
      [STUDENT_DEGREE_CERTIFICATE.CREDITS_TEXT]: transformNumberToWords(
        document.student.approvedCredits,
      ).toLowerCase(),
      [STUDENT_DEGREE_CERTIFICATE.CREDITS_NUMBER]:
        document.student.approvedCredits.toString(),
      [STUDENT_DEGREE_CERTIFICATE.INTERNSHIP_HOURS]:
        document.student.internshipHours.toString(),
      [STUDENT_DEGREE_CERTIFICATE.INTERNSHIP_HOURS_TEXT]:
        transformNumberToWords(document.student.internshipHours).toLowerCase(),
      [STUDENT_DEGREE_CERTIFICATE.VINCULATION_HOURS]:
        document.student.vinculationHours.toString(),
      [STUDENT_DEGREE_CERTIFICATE.VINCULATION_HOURS_TEXT]:
        transformNumberToWords(document.student.vinculationHours).toLowerCase(),
      [STUDENT_DEGREE_CERTIFICATE.DEGREE_CERTIFICATE_STATUS]:
        document.student.gender === GENDER.FEMALE
          ? (
              document as DegreeCertificateEntity
            ).certificateStatus.femaleName.toUpperCase()
          : (
              document as DegreeCertificateEntity
            ).certificateStatus.maleName.toUpperCase(),
    }

    return new ApiResponseDto(
      'Variables de estudiante encontradas con éxito',
      variables,
    )
  }

  getStudentVariables(document: DocumentEntity) {
    const variables = {
      [DEFAULT_VARIABLE.ESTUDIANTE]: getFullName(document.student),
      [DEFAULT_VARIABLE.ESTUDIANTEUP]: getFullName(
        document.student,
      ).toUpperCase(),
      [DEFAULT_VARIABLE.CEDULA]: document.student.dni,
      [DEFAULT_VARIABLE.MATRICULA]: document.student.registration,
      [DEFAULT_VARIABLE.FOLIO]: document.student.folio,
      [DEFAULT_VARIABLE.TELEFONO]: document.student.regularPhoneNumber,
      [DEFAULT_VARIABLE.CELULAR]: document.student.phoneNumber,
      [DEFAULT_VARIABLE.CORREO]: document.student.personalEmail,
      [DEFAULT_VARIABLE.CORREOUTA]: document.student.outlookEmail,
      [DEFAULT_VARIABLE.NOMBRECARRERA]: document.student.career.name,
      [DEFAULT_VARIABLE.NOMBRECARRERAUP]:
        document.student.career.name.toUpperCase(),
      [DEFAULT_VARIABLE.ESTUDIANTE_TITULO]:
        document.student.gender === GENDER.FEMALE
          ? document.student.career.womenDegree
          : document.student.career.menDegree,
      [DEFAULT_VARIABLE.ESTUDIANTE_FECHA_NACIMIENTO]: document.student.birthdate
        ? formatDateText(document.student.birthdate)
        : 'NO POSEE FECHA DE NACIMIENTO',
      [DEFAULT_VARIABLE.ESTUDIANTE_TITULO_UPPER]: (document.student.gender ===
      GENDER.FEMALE
        ? document.student.career.womenDegree
        : document.student.career.menDegree
      ).toUpperCase(),
      [DEFAULT_VARIABLE.COORDINADOR]: getFullName(
        document.student.career.coordinator,
      ),
      [DEFAULT_VARIABLE.CANTON]: document.student.canton.name,
      [DEFAULT_VARIABLE.PROVINCE]: document.student.canton.province.name,
    }

    return new ApiResponseDto(
      'Variables de estudiante encontradas con éxito',
      variables,
    )
  }

  async getFunctionaryVariables(
    documentFunctionaries: DocumentFunctionaryEntity[],
    council: CouncilEntity,
  ) {
    try {
      const variables = {}
      documentFunctionaries.forEach((documentFunctionary, index) => {
        // eslint-disable-next-line no-extra-parens
        variables[DEFAULT_VARIABLE.DOCENTE_N.replace('$i', index.toString())] =
          getFullNameWithTitles(documentFunctionary.functionary)
        variables[
          DEFAULT_VARIABLE.DOCENTE_N_SIN_TITU.replace('$i', index.toString())
        ] = getFullName(documentFunctionary.functionary)
        variables[
          DEFAULT_VARIABLE.DOCENTE_CARGO_N.replace('$i', index.toString())
        ] = this.getCouncilMemberPositionVariable(documentFunctionary, council)
      })

      return new ApiResponseDto(
        'Variables de docentes encontradas con éxito',
        variables,
      )
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  formatMembersNames(
    members: DegreeCertificateAttendanceEntity[] | CouncilAttendanceEntity[],
  ) {
    if (!members || members == null) return ''

    if (members.length === 1) {
      return getFullNameWithTitles(members[0].functionary)
    }

    return concatNames(
      members.map((member) => getFullNameWithTitles(member.functionary)),
    )
  }

  formatMembersDateText(membersAttendend: DegreeCertificateAttendanceEntity[]) {
    const members = membersAttendend.filter(
      (member) =>
        member.role === DEGREE_ATTENDANCE_ROLES.PRINCIPAL ||
        member.role === DEGREE_ATTENDANCE_ROLES.SUBSTITUTE,
    )

    const isDetailsDifferent = members.some(
      (member) => member.details !== members[0].details,
    )

    let membersText: string[] = []
    const hasDiferentRoles = members.some(
      (member) => member.role !== members[0].role,
    )

    if (!isDetailsDifferent) {
      if (hasDiferentRoles) {
        membersText = members.map(
          (member) =>
            `${getFullNameWithTitles(member.functionary)} ${
              MEMBERS_DESIGNATION[member.role][ADJECTIVES.SINGULAR]
            } ${member.details} de fecha ${formatDateText(
              member.assignationDate,
            )}`,
        )

        return membersText.join(', ')
      }

      return `${this.formatMembersNames(members)} ${
        members.length === 1
          ? MEMBERS_DESIGNATION[members[0].role][ADJECTIVES.SINGULAR]
          : MEMBERS_DESIGNATION[members[0].role][ADJECTIVES.PLURAL]
      } ${members[0].details} de fecha ${formatDateText(
        members[members.length - 1].assignationDate,
      )}`
    }

    const clasifiedByDetails: {
      [key: string]: DegreeCertificateAttendanceEntity[]
    } = {}
    members.forEach((member) => {
      if (!clasifiedByDetails[member.details]) {
        clasifiedByDetails[member.details] = []
      }

      clasifiedByDetails[member.details].push(member)
    })

    membersText = Object.entries(clasifiedByDetails).map(
      ([details, members]) =>
        `${this.formatMembersNames(members)} ${
          members.length === 1
            ? MEMBERS_DESIGNATION[members[0].role][ADJECTIVES.SINGULAR]
            : MEMBERS_DESIGNATION[members[0].role][ADJECTIVES.PLURAL]
        } ${details} de fecha ${formatDateText(
          members[members.length - 1].assignationDate,
        )}`,
    )

    return membersText.join(', ')
  }

  async getDegreeCertificateMemberVariables(
    members: DegreeCertificateAttendanceEntity[],
  ) {
    const membersHasntAttended = members.filter((member) => !member.hasAttended)

    const membersAttended = members.filter((member) => member.hasAttended)

    if (!membersAttended.length || membersAttended.length < 2) {
      throw new DegreeCertificateAttendanceBadRequestError(
        'No se puede generar el acta de grado sin la asistencia de al menos dos miembros',
      )
    }

    const presidentData = {}

    const president = members.find(
      (member) => member.role === DEGREE_ATTENDANCE_ROLES.PRESIDENT,
    )

    if (!president || !president.hasAttended) {
      throw new DegreeCertificateAttendanceBadRequestError(
        'No se puede generar el acta de grado sin la asistencia del presidente',
      )
    }

    if (president) {
      presidentData[DEGREE_CERTIFICATE_VARIABLES.DEGREE_CERTIFICATE_PRESIDENT] =
        getFullNameWithTitles(president.functionary)
      presidentData[
        DEGREE_CERTIFICATE_VARIABLES.DEGREE_CERTIFICATE_PRESIDENT_DOC_ASSIGNED
      ] = president.details
    }

    const membersData = {}

    const tribunalMembers = members.filter(
      (member) =>
        member.role === DEGREE_ATTENDANCE_ROLES.PRINCIPAL ||
        // eslint-disable-next-line no-extra-parens
        member.role === DEGREE_ATTENDANCE_ROLES.SUBSTITUTE,
    )

    const tribunalAttendedMembers = tribunalMembers.filter(
      (member) => member.hasAttended,
    )

    if (tribunalAttendedMembers.length < 2) {
      throw new DegreeCertificateAttendanceBadRequestError(
        'No se puede generar el acta de grado sin la asistencia de al menos dos miembros',
      )
    }

    if (tribunalMembers.length) {
      membersData[DEGREE_CERTIFICATE_VARIABLES.MEMBERS_DEGREE_CERTIFICATE] =
        this.formatMembersDateText(membersAttended)
      membersData[
        DEGREE_CERTIFICATE_VARIABLES.FIRST_MEMBER_DEGREE_CERTIFICATE
      ] = getFullNameWithTitles(tribunalAttendedMembers[0].functionary)
      membersData[
        DEGREE_CERTIFICATE_VARIABLES.SECOND_MEMBER_DEGREE_CERTIFICATE
      ] = getFullNameWithTitles(tribunalAttendedMembers[1].functionary)
      membersData[DEGREE_CERTIFICATE_VARIABLES.FIRST_MEMBER_WITHOUTH_DEGREES] =
        getFullName(tribunalAttendedMembers[0].functionary)
      membersData[DEGREE_CERTIFICATE_VARIABLES.SECOND_MEMBER_WITHOUTH_DEGREES] =
        getFullName(tribunalAttendedMembers[1].functionary)
      membersData[DEGREE_CERTIFICATE_VARIABLES.FIRST_MEMBER_THIRDL_DEGREE_ABR] =
        getThirdLevelDegree(tribunalAttendedMembers[0].functionary)
      membersData[
        DEGREE_CERTIFICATE_VARIABLES.SECOND_MEMBER_THIRDL_DEGREE_ABR
      ] = getThirdLevelDegree(tribunalAttendedMembers[1].functionary)
      membersData[DEGREE_CERTIFICATE_VARIABLES.FIRST_MEMBER_FOURTHL_DEGREE] =
        getFourthLevelDegree(tribunalAttendedMembers[0].functionary)
      membersData[DEGREE_CERTIFICATE_VARIABLES.SECOND_MEMBER_FOURTHL_DEGREE] =
        getFourthLevelDegree(tribunalAttendedMembers[1].functionary)
      membersData[
        DEGREE_CERTIFICATE_VARIABLES.FIRST_MEMBER_FOURTHL_DEGREE_START
      ] = getFullNameWithFourthLevelDegreeFirst(
        tribunalAttendedMembers[0].functionary,
      )
      membersData[
        DEGREE_CERTIFICATE_VARIABLES.SECOND_MEMBER_FOURTHL_DEGREE_START
      ] = getFullNameWithFourthLevelDegreeFirst(
        tribunalAttendedMembers[1].functionary,
      )
      membersData[DEFAULT_VARIABLE.ASISTIERON] = `${this.formatMembersNames(
        membersAttended,
      )}`
      membersData[DEFAULT_VARIABLE.NO_ASISTIERON] = `${this.formatMembersNames(
        membersHasntAttended,
      )}`
    }

    const qb = this.dataSource
      .createQueryBuilder(PositionEntity, 'position')
      .leftJoinAndSelect('position.functionary', 'functionary')
      .where('position.variable = :variable', {
        variable: DEGREE_CERTIFICATE_VARIABLES.DECANA,
      })
      .orWhere('position.variable = :variable', {
        variable: DEGREE_CERTIFICATE_VARIABLES.IC_UNIT_PRESIDENT,
      })

    const positions = await qb.getMany()

    const decana = positions.find(
      (position) => position.variable === DEGREE_CERTIFICATE_VARIABLES.DECANA,
    )

    if (decana) {
      membersData[DEGREE_CERTIFICATE_VARIABLES.DECANA] = getFullNameWithTitles(
        decana.functionary,
      )
    }

    const icUnitPresident = positions.find(
      (position) =>
        position.variable === DEGREE_CERTIFICATE_VARIABLES.IC_UNIT_PRESIDENT,
    )

    if (icUnitPresident) {
      membersData[DEGREE_CERTIFICATE_VARIABLES.IC_UNIT_PRESIDENT] =
        getFullNameWithTitles(icUnitPresident.functionary)
    }

    return { ...presidentData, ...membersData }
  }

  getDegreeCertificateTitulationVariables(
    degreeCertificate: DegreeCertificateEntity,
    presentationDate: Date,
  ) {
    const year = presentationDate.getFullYear().toString().toLowerCase()
    const monthText = formatMonthName(presentationDate)
    const dayText = transformNumberToWords(
      presentationDate.getDate(),
    ).toLowerCase()

    return {
      [DEGREE_CERTIFICATE_VARIABLES.DEGREE_CERTIFICATE_TYPE]:
        degreeCertificate.certificateType.name.toUpperCase(),
      [DEGREE_CERTIFICATE_VARIABLES.DEGREE_CERTIFICATE_TOPIC]:
        degreeCertificate.topic.toUpperCase(),
      // eslint-disable-next-line no-magic-numbers
      [DEFAULT_VARIABLE.NUMDOC]: formatNumeration(degreeCertificate.number, 3),
      [DEFAULT_VARIABLE.Y]: year,
      [DEFAULT_VARIABLE.YEAR]: year,
      [DEFAULT_VARIABLE.FECHA]: formatDateText(presentationDate),
      [DEFAULT_VARIABLE.FECHAUP]:
        formatDateText(presentationDate).toUpperCase(),
      [DEFAULT_VARIABLE.DIASEM_T]: formatWeekDayName(presentationDate),
      [DEFAULT_VARIABLE.NUMMES_T_U]: monthText.toUpperCase(),
      [DEFAULT_VARIABLE.MES_T_L]: monthText.toLowerCase(),
      [DEFAULT_VARIABLE.DIAS_T]: `${dayText} días`,
      [DEFAULT_VARIABLE.NUMDIA_T]: dayText.toLowerCase(),
      [DEFAULT_VARIABLE.NUMANIO_T]: transformNumberToWords(
        presentationDate.getFullYear(),
      ).toUpperCase(),
      [DEFAULT_VARIABLE.NUMANIO_T_L]: transformNumberToWords(
        presentationDate.getFullYear(),
      ).toLowerCase(),
      [DEFAULT_VARIABLE.HORA_T_L]: transformNumberToWords(
        presentationDate.getHours(),
      ).toLowerCase(),
      [DEFAULT_VARIABLE.MINUTOS_T_L]: transformNumberToWords(
        presentationDate.getMinutes(),
      ).toLowerCase(),
      [DEFAULT_VARIABLE.HORA_MINUTOS_TEXTO_L]:
        formatHourMinutesText(presentationDate).toLowerCase(),
    }
  }

  async getDegreeCertificateVariables(
    degreeCertificate: DegreeCertificateEntity,
    degreeCertificateAttendance: DegreeCertificateAttendanceEntity[],
  ) {
    // set timezone GMT-5
    // const presentationDate = moment(degreeCertificate.presentationDate)
    //   .tz('America/Bogota')
    //   .toDate()

    const presentationDate = new Date(
      degreeCertificate.presentationDate.toString(),
    )
    const { data: studentData } =
      this.getStudentDegreeCertificateVariables(degreeCertificate)

    const memberData = await this.getDegreeCertificateMemberVariables(
      degreeCertificateAttendance,
    )

    const titulationData = this.getDegreeCertificateTitulationVariables(
      degreeCertificate,
      presentationDate,
    )

    const { data: positionsVariables } = await this.getPositionVariables()

    return new ApiResponseDto('Variables de acta generadas éxito', {
      ...studentData,
      ...memberData,
      ...titulationData,
      ...positionsVariables,
    })
  }

  // TODO: Cambiar la condicion de asistencia una vez implementada la asistencia de consejos

  async getRecopilationVariables(numdoc: number, council: CouncilEntity) {
    try {
      const hasAttended = council.attendance.filter(
        (attendance) => attendance,
        // (attendance) => attendance.hasAttended,
      )
      const hasNotAttended = council.attendance.filter(
        // (attendance) => !attendance.hasAttended,
        (attendance) => attendance,
      )

      const variables = {
        [DEFAULT_VARIABLE.FECHA]: formatDate(council.date),
        [DEFAULT_VARIABLE.RESPONSABLE]: getFullNameWithTitles(
          council.attendance.find(
            (attendance) => attendance.positionOrder === 1,
          ).functionary,
        ),
        // eslint-disable-next-line no-magic-numbers
        [DEFAULT_VARIABLE.NUMACT]: formatNumeration(numdoc, 3),
        [DEFAULT_VARIABLE.FECHAUP]: formatDateText(council.date),
        [DEFAULT_VARIABLE.SESIONUP]: council.type.toUpperCase(),
        [DEFAULT_VARIABLE.SESION]: council.type.toLowerCase(),
        [DEFAULT_VARIABLE.SESION_L]: council.type.toLowerCase(),
        [DEFAULT_VARIABLE.Y]: council.date.getFullYear().toString(),
        [DEFAULT_VARIABLE.DIASEM_T]: formatWeekDayName(
          council.date,
        ).toUpperCase(),
        [DEFAULT_VARIABLE.NUMMES_T_U]: formatMonthName(
          council.date,
        ).toUpperCase(),
        [DEFAULT_VARIABLE.MES_T_L]: formatMonthName(council.date).toLowerCase(),
        [DEFAULT_VARIABLE.NUMDIA_T]: transformNumberToWords(
          council.date.getDate(),
        ),
        [DEFAULT_VARIABLE.NUMANIO_T]: transformNumberToWords(
          council.date.getFullYear(),
        ),
        [DEFAULT_VARIABLE.NUMANIO_T_L]: transformNumberToWords(
          council.date.getFullYear(),
        ).toLowerCase(),
        [DEFAULT_VARIABLE.DIAS_T]: `${transformNumberToWords(
          council.date.getDate(),
        ).toLowerCase()} días`,
        [DEFAULT_VARIABLE.HORA_T_L]: transformNumberToWords(
          council.date.getHours(),
        ).toLowerCase(),
        [DEFAULT_VARIABLE.MINUTOS_T_L]: transformNumberToWords(
          council.date.getMinutes(),
        ).toLowerCase(),
        [DEFAULT_VARIABLE.ASISTIERON]:
          hasAttended?.length > 0
            ? this.formatMembersNames(hasAttended)
            : 'NO ASISTIÓ NINGUN MIEMBRO',
        [DEFAULT_VARIABLE.NO_ASISTIERON]: hasNotAttended
          ? this.formatMembersNames(hasNotAttended)
          : 'ASISTIERON TODOS LOS MIEMBROS',
      }
      const { data: positionsVariables } = await this.getPositionVariables()

      return new ApiResponseDto(
        'Variables de recopilación encontradas con éxito',
        {
          ...variables,
          ...positionsVariables,
        },
      )
    } catch (error) {
      this.logger.log(error)
      throw new InternalServerErrorException(error.message)
    }
  }

  async getPositionVariables() {
    try {
      const variables = {}

      const qb = this.dataSource
        .createQueryBuilder(PositionEntity, 'position')
        .leftJoinAndSelect('position.functionary', 'functionary')

      const positions = await qb.getMany()

      positions.forEach(
        (position) =>
          // eslint-disable-next-line no-extra-parens
          (variables[position.variable] = getFullNameWithTitles(
            position.functionary,
          )),
      )

      return new ApiResponseDto(
        'Variables de posiciones encontradas con éxito',
        variables,
      )
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }

  async getCustomVariables() {
    try {
      const variables: { [DefaultVariable: string]: string } = {}

      const { data: customVariables } = await this.findAll()

      customVariables.forEach(
        (customVariable) =>
          // eslint-disable-next-line no-extra-parens
          (variables[customVariable.variable] = customVariable.value),
      )

      return new ApiResponseDto(
        'Variables personalizadas encontradas con éxito',
        variables,
      )
    } catch (error) {
      throw new InternalServerErrorException(error.message)
    }
  }
  async getCouncilMemberPositionVariable(
    docFunc: DocumentFunctionaryEntity,
    council: CouncilEntity,
  ) {
    const attendance = await CouncilAttendanceEntity.findOne({
      where: {
        functionary: {
          id: docFunc.functionary.id,
        },
        council: {
          id: council.id,
        },
      },
    })

    return attendance.positionName
  }
}
