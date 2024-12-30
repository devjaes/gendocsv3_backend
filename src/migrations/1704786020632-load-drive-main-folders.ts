import { MigrationInterface, QueryRunner } from 'typeorm'
import { YearModuleEntity } from '../year-module/entities/year-module.entity'
import { SubmoduleYearModuleEntity } from '../year-module/entities/submodule-year-module.entity'
import { CertificateTypeEntity } from '../degree-certificates/entities/certificate-type.entity'
import { CertificateStatusEntity } from '../degree-certificates/entities/certificate-status.entity'
import { DegreeModalityEntity } from '../degree-certificates/entities/degree-modality.entity'
import { CertificateTypeCareerEntity } from '../degree-certificates/entities/certicate-type-career.entity'
import { CertificateTypeStatusEntity } from '../degree-certificates/entities/certificate-type-status.entity'
import { RoomEntity } from '../degree-certificates/entities/room.entity'
import { CareerEntity } from '../careers/entites/careers.entity'
import { CellsGradeDegreeCertificateTypeEntity } from '../degree-certificates/entities/cells-grade-degree-certificate-type.entity'

export class LoadDriveMainFolders1704786020632 implements MigrationInterface {
  name?: string
  transaction?: boolean
  public async up(queryRunner: QueryRunner): Promise<void> {
    const connection = queryRunner.connection

    const yearModuleRepository = connection.getRepository(YearModuleEntity)
    const submoduleYearModuleRepository = connection.getRepository(
      SubmoduleYearModuleEntity,
    )
    const careerRepository = connection.getRepository(CareerEntity)
    const certificateTypeRepository = connection.getRepository(
      CertificateTypeEntity,
    )
    const certificateStatusRepository = connection.getRepository(
      CertificateStatusEntity,
    )
    const degreeModalityRepository =
      connection.getRepository(DegreeModalityEntity)
    const certificateTypeCareerRepository = connection.getRepository(
      CertificateTypeCareerEntity,
    )
    const cetificateTypeStatusRepository = connection.getRepository(
      CertificateTypeStatusEntity,
    )
    const cellsGradeCertificateTypeRepository = connection.getRepository(
      CellsGradeDegreeCertificateTypeEntity,
    )
    const roomRepository = connection.getRepository(RoomEntity)

    const queryRunner2 = connection.createQueryRunner()
    await queryRunner2.connect()
    await queryRunner2.startTransaction()

    const careers = [
      {
        id: 1,
        internshipHours: 400,
        vinculationHours: 160,
        coordinator: { id: 1 },
        name: 'Ingeniería en Sistemas Computacionales e Informáticos',
        credits: 246,
        menDegree: 'Ingeniero en Sistemas Computacionales e Informáticos',
        womenDegree: 'Ingeniera en Sistemas Computacionales e Informáticos',
        isActive: true,
        moduleName: 'SISTEMAS',
      },
      {
        id: 2,
        internshipHours: 400,
        vinculationHours: 160,
        coordinator: { id: 1 },
        name: 'Ingeniería en Electrónica y Comunicaciones',
        credits: 247,
        menDegree: 'Ingeniero en Electrónica y Comunicaciones',
        womenDegree: 'Ingeniera en Electrónica y Comunicaciones',
        isActive: true,
        moduleName: 'ELECTRÓNICA Y COMUNICACIONES',
      },
      {
        id: 3,
        internshipHours: 400,
        vinculationHours: 160,
        coordinator: { id: 1 },
        name: 'Ingeniería Industrial en Procesos de Automatización',
        credits: 247,
        menDegree: 'Ingeniero Industrial en Procesos de Automatización',
        womenDegree: 'Ingeniera Industrial en Procesos de Automatización',
        isActive: true,
        moduleName: 'INDUSTRIAL EN PROCESOS',
      },
      {
        id: 4,
        internshipHours: 240,
        vinculationHours: 96,
        coordinator: { id: 1 },
        name: 'Tecnologías de la Información',
        credits: 135,
        menDegree: 'Ingeniero en Tecnologías de la Información',
        womenDegree: 'Ingeniera en Tecnologías de la Información',
        isActive: true,
        moduleName: 'TECNOLOGÍA DE INFORMACIÓN',
      },
      {
        id: 5,
        internshipHours: 240,
        vinculationHours: 96,
        coordinator: { id: 1 },
        name: 'Telecomunicaciones',
        credits: 135,
        menDegree: 'Ingeniero en Telecomunicaciones',
        womenDegree: 'Ingeniera en Telecomunicaciones',
        isActive: true,
        moduleName: 'TELECOMUNICACIONES',
      },
      {
        id: 6,
        internshipHours: 240,
        vinculationHours: 96,
        coordinator: { id: 1 },
        name: 'Ingeniería Industrial',
        credits: 135,
        menDegree: 'Ingeniero Industrial',
        womenDegree: 'Ingeniera Industrial',
        isActive: true,
        moduleName: 'INDUSTRIAL',
      },
      {
        id: 7,
        internshipHours: 240,
        vinculationHours: 96,
        coordinator: { id: 1 },
        name: 'Software',
        credits: 135,
        menDegree: 'Ingeniero en Software',
        womenDegree: 'Ingeniera en Software',
        isActive: true,
        moduleName: 'SOFTWARE',
      },
      {
        id: 8,
        internshipHours: 240,
        vinculationHours: 96,
        coordinator: { id: 1 },
        name: 'Automatización y Robótica',
        credits: 135,
        menDegree: 'Ingeniero en Automatización y Robótica',
        womenDegree: 'Ingeniera en Automatización y Robótica',
        isActive: true,
        moduleName: 'AUTOMATIZACIÓN Y ROBÓTICA',
      },
    ]

    await queryRunner2.manager.save(
      careers.map((c) => careerRepository.create(c)),
    )

    const certificateTypeData = [
      {
        id: 1,
        code: 'T-EGCC',
        name: 'EXAMEN DE GRADO DE CARÁCTER COMPLEXIVO',
        driveId: '1npNBr0AAmGfjifCzj_2G0r895eacAp7MzynmXPnrrwU',
      },
      {
        id: 2,
        code: 'T-PI',
        name: 'PROYECTO DE INVESTIGACIÓN',
        driveId: '1AdOBa8TYcZam7CySXtYuSA7fluTtlZCh0X7W8brC5NY',
      },
      {
        id: 3,
        code: 'T-AA',
        name: 'ARTÍCULO ACADÉMICO',
        driveId: '1kmfaL43roweSiCSke8g9byUJ0zZPU4texXobwxyFxoo',
      },
      {
        id: 4,
        code: 'IC-EGCC',
        name: 'EXAMEN DE GRADO DE CARÁCTER COMPLEXIVO',
        driveId: '1g6CbA1FRpCs-uL5PbNXQBewR0_qxt9XoeZR1am41WeQ',
      },
      {
        id: 5,
        code: 'IC-PI',
        name: 'PROYECTO DE INVESTIGACIÓN',
        driveId: '1Pe7J8bfU4tVaYPA_z8aNmdVnxFaR0mJtjzPzV0uRkgM',
      },
      {
        id: 6,
        code: 'IC-AA',
        name: 'ARTÍCULO ACADÉMICO',
        driveId: '1AdVRbVGl84jULDRG0K-oScgxsZm9CqnkeqMw2A4z2KE',
      },
    ]

    const certificateStatusData = [
      {
        id: 1,
        code: 'APRO',
        maleName: 'APROBADO',
        femaleName: 'APROBADA',
      },
      {
        id: 2,
        code: 'REPR',
        maleName: 'REPROBADO',
        femaleName: 'REPROBADA',
      },
      {
        id: 3,
        code: 'NO_RESENTACION',
        maleName: 'NO PRESENTACIÓN',
        femaleName: 'NO PRESENTACIÓN',
      },
    ]

    const degreeModalityData = [
      {
        code: 'ONL',
        name: 'Online',
      },
      {
        code: 'PRE',
        name: 'Presencial',
      },
    ]

    const certificateTypeCareerData = [
      // 1
      {
        certificateType: {
          id: 1,
        },
        career: {
          id: 1,
        },
      },
      // 2
      {
        certificateType: {
          id: 1,
        },
        career: {
          id: 2,
        },
      },
      // 3
      {
        certificateType: {
          id: 1,
        },
        career: {
          id: 3,
        },
      },
      // 4
      {
        certificateType: {
          id: 2,
        },
        career: {
          id: 1,
        },
      },
      // 5
      {
        certificateType: {
          id: 2,
        },
        career: {
          id: 2,
        },
      },
      // 6
      {
        certificateType: {
          id: 2,
        },
        career: {
          id: 3,
        },
      },
      // 7
      {
        certificateType: {
          id: 3,
        },
        career: {
          id: 1,
        },
      },
      // 8
      {
        certificateType: {
          id: 3,
        },
        career: {
          id: 2,
        },
      },
      // 9
      {
        certificateType: {
          id: 3,
        },
        career: {
          id: 3,
        },
      },
      // 10
      {
        certificateType: {
          id: 4,
        },
        career: {
          id: 4,
        },
      },
      // 11
      {
        certificateType: {
          id: 4,
        },
        career: {
          id: 5,
        },
      },
      // 12
      {
        certificateType: {
          id: 4,
        },
        career: {
          id: 6,
        },
      },
      // 13
      {
        certificateType: {
          id: 4,
        },
        career: {
          id: 7,
        },
      },
      // 14
      {
        certificateType: {
          id: 5,
        },
        career: {
          id: 4,
        },
      },
      // 15
      {
        certificateType: {
          id: 5,
        },
        career: {
          id: 5,
        },
      },
      // 16
      {
        certificateType: {
          id: 5,
        },
        career: {
          id: 6,
        },
      },
      // 17
      {
        certificateType: {
          id: 5,
        },
        career: {
          id: 7,
        },
      },
      // 18
      {
        certificateType: {
          id: 6,
        },
        career: {
          id: 4,
        },
      },
      // 19
      {
        certificateType: {
          id: 6,
        },
        career: {
          id: 5,
        },
      },
      // 20
      {
        certificateType: {
          id: 6,
        },
        career: {
          id: 6,
        },
      },
      // 21
      {
        certificateType: {
          id: 6,
        },
        career: {
          id: 7,
        },
      },
      // 22
      {
        certificateType: {
          id: 4,
        },
        career: {
          id: 8,
        },
      },
      // 23
      {
        certificateType: {
          id: 5,
        },
        career: {
          id: 8,
        },
      },
      // 24
      {
        certificateType: {
          id: 6,
        },
        career: {
          id: 8,
        },
      },
    ]

    const cetificateTypeStatusData = [
      // 1
      {
        certificateType: {
          id: 1,
        },
        certificateStatus: {
          id: 1,
        },
        driveId: '1bw0a8opzKx8kjRidMOyDgz4h6lb0j04O0uP9fTTTm48',
      },
      // 2
      {
        certificateType: {
          id: 1,
        },
        certificateStatus: {
          id: 2,
        },
        driveId: '1biEMMwsXk_FbL3Vl1s0M4NdSEEFJEcWq5KhWDhBVxtA',
      },
      // 3
      {
        certificateType: {
          id: 2,
        },
        certificateStatus: {
          id: 1,
        },
        driveId: '1Tg5r31CIDzeKOC5roMqzzIotfyrAgPw_hteZLDmTR4A',
      },
      // 4
      {
        certificateType: {
          id: 2,
        },
        certificateStatus: {
          id: 2,
        },
        driveId: '1Y-QPCI3Z9d00-qHUFecRmngJD_WqoRhIXyTTc6aci90',
      },
      // 5
      {
        certificateType: {
          id: 2,
        },
        certificateStatus: {
          id: 3,
        },
        driveId: '10WB4U-kC7PJsrvXLiHi3X137BwN-pDOY0VRZ5olNlx8',
      },
      // 6
      {
        certificateType: {
          id: 3,
        },
        certificateStatus: {
          id: 1,
        },
        driveId: '1nX04MOdUxWuntFLTBSXtDZp2Lf5xW5cYaTFNwhOH8Gc',
      },
      // 7
      {
        certificateType: {
          id: 3,
        },
        certificateStatus: {
          id: 2,
        },
        driveId: '1AKUfBLqs5HZuouHYnJLHimnmIixjs3q6Pjv7UTlvSC4',
      },
      // 8
      {
        certificateType: {
          id: 3,
        },
        certificateStatus: {
          id: 3,
        },
        driveId: '1NozbXJ0I5IS9JYXGKFHGvFN54lmmqVdPqHgotkZq-fE',
      },
      // 9
      {
        certificateType: {
          id: 4,
        },
        certificateStatus: {
          id: 1,
        },
        driveId: '1OMwAeOk8VDNIsomYlPji0e0j7fbwoCd4GoEB_lt9EKQ',
      },
      // 10
      {
        certificateType: {
          id: 4,
        },
        certificateStatus: {
          id: 2,
        },
        driveId: '1vpcSBLdPqEh4unjUjun-48fq0BQka8m5fNq-aFFaIms',
      },
      // 11
      {
        certificateType: {
          id: 5,
        },
        certificateStatus: {
          id: 1,
        },
        driveId: '1yVyl0QskoAJT6XrSJV1s_qSyA6FF3psHk_06GxKsJJE',
      },
      // 12
      {
        certificateType: {
          id: 5,
        },
        certificateStatus: {
          id: 2,
        },
        driveId: '17MWXyExhb5aE3sWs78WU1_wtnXiGJTSltCRQVckD4Ck',
      },
      // 13
      {
        certificateType: {
          id: 5,
        },
        certificateStatus: {
          id: 3,
        },
        driveId: '1_O6zzc5cDFen5Mp4c7ZxG_3j2cnZ8L2l3sdLnUs2I_Y',
      },
      // 14
      {
        certificateType: {
          id: 6,
        },
        certificateStatus: {
          id: 1,
        },
        driveId: '1xY7WFL21k5wdD64UNJzB_PpbcnfxaIHK9OvUkGzgn10',
      },
      // 15
      {
        certificateType: {
          id: 6,
        },
        certificateStatus: {
          id: 2,
        },
        driveId: '1qnwbhslQL-lq-Jiw3e7zxY1tEUQ1KtAskFSlo6IE_AY',
      },
      // 16
      {
        certificateType: {
          id: 6,
        },
        certificateStatus: {
          id: 3,
        },
        driveId: '1ueGrgn-WzCTWaI-YCfUf_TDlCRvdiN8ODxlYHnnRvZI',
      },
    ]

    const cellGradeDegreeCertificateTypeData = [
      // Tipo Acta Grado ID 3
      {
        cell: 'C5',
        gradeVariable: 'NOTAMALLA',
        gradeTextVariable: 'NOTAMALLA_TEXTO',
        certificateType: {
          id: 3,
        },
      },
      {
        cell: 'F5',
        gradeVariable: 'NOTAMALLA60',
        gradeTextVariable: 'NOTAMALLA60_TEXTO',
        certificateType: {
          id: 3,
        },
      },
      {
        cell: 'C10',
        gradeVariable: 'NOTA_ESCRITA_1',
        gradeTextVariable: 'NOTA_ESCRITA_1_TEXTO',
        certificateType: {
          id: 3,
        },
      },
      {
        cell: 'D10',
        gradeVariable: 'NOTA_ESCRITA_2',
        gradeTextVariable: 'NOTA_ESCRITA_2_TEXTO',
        certificateType: {
          id: 3,
        },
      },
      {
        cell: 'F10',
        gradeVariable: 'NOTAESCRITA',
        gradeTextVariable: 'NOTAESCRITA_TEXTO',
        certificateType: {
          id: 3,
        },
      },
      {
        cell: 'F12',
        gradeVariable: 'NOTAORAL',
        gradeTextVariable: 'NOTAORAL_TEXTO',
        certificateType: {
          id: 3,
        },
      },
      {
        cell: 'C16',
        gradeVariable: 'NOTAPROMEDIO',
        gradeTextVariable: 'NOTAPROMEDIO_TEXTO',
        certificateType: {
          id: 3,
        },
      },
      {
        cell: 'F16',
        gradeVariable: 'NOTAPROMEDIO40',
        gradeTextVariable: 'NOTAPROMEDIO40_TEXTO',
        certificateType: {
          id: 3,
        },
      },
      {
        cell: 'F19',
        gradeVariable: 'NOTAFINAL',
        gradeTextVariable: 'NOTAFINAL_TEXTO',
        certificateType: {
          id: 3,
        },
      },

      // Tipo Acta Grado ID 2
      {
        cell: 'C5',
        gradeVariable: 'NOTAMALLA',
        gradeTextVariable: 'NOTAMALLA_TEXTO',
        certificateType: {
          id: 2,
        },
      },
      {
        cell: 'F5',
        gradeVariable: 'NOTAMALLA60',
        gradeTextVariable: 'NOTAMALLA60_TEXTO',
        certificateType: {
          id: 2,
        },
      },
      {
        cell: 'C10',
        gradeVariable: 'NOTA_ESCRITA_1',
        gradeTextVariable: 'NOTA_ESCRITA_1_TEXTO',
        certificateType: {
          id: 2,
        },
      },
      {
        cell: 'D10',
        gradeVariable: 'NOTA_ESCRITA_2',
        gradeTextVariable: 'NOTA_ESCRITA_2_TEXTO',
        certificateType: {
          id: 2,
        },
      },
      {
        cell: 'F10',
        gradeVariable: 'NOTAESCRITA',
        gradeTextVariable: 'NOTAESCRITA_TEXTO',
        certificateType: {
          id: 2,
        },
      },
      {
        cell: 'F12',
        gradeVariable: 'NOTAORAL',
        gradeTextVariable: 'NOTAORAL_TEXTO',
        certificateType: {
          id: 2,
        },
      },
      {
        cell: 'C16',
        gradeVariable: 'NOTAPROMEDIO',
        gradeTextVariable: 'NOTAPROMEDIO_TEXTO',
        certificateType: {
          id: 2,
        },
      },
      {
        cell: 'F16',
        gradeVariable: 'NOTAPROMEDIO40',
        gradeTextVariable: 'NOTAPROMEDIO40_TEXTO',
        certificateType: {
          id: 2,
        },
      },
      {
        cell: 'F19',
        gradeVariable: 'NOTAFINAL',
        gradeTextVariable: 'NOTAFINAL_TEXTO',
        certificateType: {
          id: 2,
        },
      },

      // Tipo Acta Grado ID 1
      {
        cell: 'C5',
        gradeVariable: 'NOTAMALLA',
        gradeTextVariable: 'NOTAMALLA_TEXTO',
        certificateType: {
          id: 1,
        },
      },
      {
        cell: 'F5',
        gradeVariable: 'NOTAMALLA60',
        gradeTextVariable: 'NOTAMALLA60_TEXTO',
        certificateType: {
          id: 1,
        },
      },
      {
        cell: 'C7',
        gradeVariable: 'NOTAPRACTICA',
        gradeTextVariable: 'NOTAPRACTICA_TEXTO',
        certificateType: {
          id: 1,
        },
      },
      {
        cell: 'C8',
        gradeVariable: 'NOTAESCRITA',
        gradeTextVariable: 'NOTAESCRITA_TEXTO',
        certificateType: {
          id: 1,
        },
      },
      {
        cell: 'C9',
        gradeVariable: 'NOTACOMPLEXIVO',
        gradeTextVariable: 'NOTACOMPLEXIVO_TEXTO',
        certificateType: {
          id: 1,
        },
      },
      {
        cell: 'F9',
        gradeVariable: 'NOTACOMPLEXIVO40',
        gradeTextVariable: 'NOTACOMPLEXIVO40_TEXTO',
        certificateType: {
          id: 1,
        },
      },
      {
        cell: 'F12',
        gradeVariable: 'NOTAGRADO',
        gradeTextVariable: 'NOTAGRADO_TEXTO',
        certificateType: {
          id: 1,
        },
      },

      // Tipo Acta Grado ID 4
      {
        cell: 'C3',
        gradeVariable: 'NOTAMALLA',
        gradeTextVariable: 'NOTAMALLA_TEXTO',
        certificateType: {
          id: 4,
        },
      },
      {
        cell: 'C5',
        gradeVariable: 'NOTAPRACTICA',
        gradeTextVariable: 'NOTAPRACTICA_TEXTO',
        certificateType: {
          id: 4,
        },
      },
      {
        cell: 'C7',
        gradeVariable: 'NOTACOMPLEXIVO',
        gradeTextVariable: 'NOTACOMPLEXIVO_TEXTO',
        certificateType: {
          id: 4,
        },
      },
      {
        cell: 'H3',
        gradeVariable: 'NOTAGRADO',
        gradeTextVariable: 'NOTAGRADO_TEXTO',
        certificateType: {
          id: 4,
        },
      },
      {
        cell: 'C6',
        gradeVariable: 'NOTATEORICO',
        gradeTextVariable: 'NOTATEORICO_TEXTO',
        certificateType: {
          id: 4,
        },
      },

      // Tipo Acta Grado ID 6
      {
        cell: 'C4',
        gradeVariable: 'NOTAMALLA',
        gradeTextVariable: 'NOTAMALLA_TEXTO',
        certificateType: {
          id: 6,
        },
      },
      {
        cell: 'C9',
        gradeVariable: 'NOTA_ESCRITA_1',
        gradeTextVariable: 'NOTA_ESCRITA_1_TEXTO',
        certificateType: {
          id: 6,
        },
      },
      {
        cell: 'D9',
        gradeVariable: 'NOTA_ESCRITA_2',
        gradeTextVariable: 'NOTA_ESCRITA_2_TEXTO',
        certificateType: {
          id: 6,
        },
      },
      {
        cell: 'F9',
        gradeVariable: 'NOTAESCRITA',
        gradeTextVariable: 'NOTAESCRITA_TEXTO',
        certificateType: {
          id: 6,
        },
      },
      {
        cell: 'F11',
        gradeVariable: 'NOTAORAL',
        gradeTextVariable: 'NOTAORAL_TEXTO',
        certificateType: {
          id: 6,
        },
      },
      {
        cell: 'C13',
        gradeVariable: 'NOTAPROMEDIO',
        gradeTextVariable: 'NOTAPROMEDIO_TEXTO',
        certificateType: {
          id: 6,
        },
      },
      {
        cell: 'F16',
        gradeVariable: 'NOTAFINAL',
        gradeTextVariable: 'NOTAFINAL_TEXTO',
        certificateType: {
          id: 6,
        },
      },

      // Tipo Acta Grado ID 5
      {
        cell: 'C4',
        gradeVariable: 'NOTAMALLA',
        gradeTextVariable: 'NOTAMALLA_TEXTO',
        certificateType: {
          id: 5,
        },
      },
      {
        cell: 'C9',
        gradeVariable: 'NOTA_ESCRITA_1',
        gradeTextVariable: 'NOTA_ESCRITA_1_TEXTO',
        certificateType: {
          id: 5,
        },
      },
      {
        cell: 'D9',
        gradeVariable: 'NOTA_ESCRITA_2',
        gradeTextVariable: 'NOTA_ESCRITA_2_TEXTO',
        certificateType: {
          id: 5,
        },
      },
      {
        cell: 'F9',
        gradeVariable: 'NOTAESCRITA',
        gradeTextVariable: 'NOTAESCRITA_TEXTO',
        certificateType: {
          id: 5,
        },
      },
      {
        cell: 'F11',
        gradeVariable: 'NOTAORAL',
        gradeTextVariable: 'NOTAORAL_TEXTO',
        certificateType: {
          id: 5,
        },
      },
      {
        cell: 'C13',
        gradeVariable: 'NOTAPROMEDIO',
        gradeTextVariable: 'NOTAPROMEDIO_TEXTO',
        certificateType: {
          id: 5,
        },
      },
      {
        cell: 'F16',
        gradeVariable: 'NOTAFINAL',
        gradeTextVariable: 'NOTAFINAL_TEXTO',
        certificateType: {
          id: 5,
        },
      },
    ]

    const roomData = [
      {
        name: 'AULA C08',
      },
      {
        name: 'AULA F01',
      },
      {
        name: 'AULA F02',
      },
      {
        name: 'LAB. REDES 2',
      },
      {
        name: 'LAB. CTT',
      },
      {
        name: 'AUDIOVISUALES',
      },
      {
        name: 'AUDITORIO',
      },
      {
        name: 'CONSEJO DIRECTIVO',
      },
      {
        name: 'CONSEJO ACADÉMICO',
      },
      {
        name: 'AULA F03',
      },
    ]

    const yearModuleData = [
      // 1
      {
        year: 2024,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1kLqtSvzNap_iC787uXit7DxcH1uBLtk8'
            : '1cBw8ldhcEP8cfXmr9MhZZlDcAiq9KwNv',
        isActive: true,
        moduleId: 9,
        module: {
          id: 9,
        },
      },
      // 2
      {
        year: 2024,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1GILU4ZJ6j_NCzNuINY23BKWhKCZ7Oby0'
            : '1bDL7qiunP_KX9dX_nylRAhFmJP8w9wia',
        isActive: true,
        module: {
          id: 8,
        },
      },
      // 3
      {
        year: 2024,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1aIAlnqy3h9c3eo5EL-a2imaP1mjZS5Jp'
            : '1Dzay8xFAfoWFhpMV2PlSyB74iijpO55m',
        isActive: true,
        module: {
          id: 7,
        },
      },
      // 4
      {
        year: 2024,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1ILpzpiMyKa4DZPNtSQ2jCGPZnW-2TvcX'
            : '105qD4IBAzdUOs7Wc3STtt-b1KZA6umgj',
        isActive: true,
        module: {
          id: 6,
        },
      },
      // 5
      {
        year: 2024,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1f1bKMbE9oQc0jMpwPeHa0NpgOLNSoVcc'
            : '1tjONGkFa-3XisVTzy-YoUbldxMvdxQD9',
        isActive: true,
        module: {
          id: 5,
        },
      },
      // 6
      {
        year: 2024,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1l_k4e3wGFt8owAZiLgoS-XhgHy4JLp69'
            : '1yE4oJIRrN3MWv8RO-K7FZJ2vSvrUZkNW',
        isActive: true,
        module: {
          id: 4,
        },
      },
      // 7
      {
        year: 2024,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1K8i3UITeETMqKiL1ZpTt1vyFoadOB-fa'
            : '1yaCOa3zMV_6ygjSUEAenIkQ7EwIB49q9',
        isActive: true,
        module: {
          id: 3,
        },
      },
      // 8
      {
        year: 2024,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1Uk077vFDJfeZ3bWkNK1ITZ6gs-71MMp-'
            : '1Bd6duD1zeqmW_nySLDB-S-jap7HRH6I-',
        isActive: true,
        module: {
          id: 2,
        },
      },
      // 9
      {
        year: 2024,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1JExETZfoKlomyJG1kleGya8gp_UVcMDh'
            : '1KjoToTEpeeAVPXuYhGAkhcUEwsJgtz1O',
        isActive: true,
        module: {
          id: 1,
        },
      },
      // 10
      {
        year: 2024,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1Lw1t8zWeG1sZZ3swNIQJLU2_ddSG24gk'
            : '1qwsrsSy--lTjeaoyjTVhF911b5YbjXjQ',
        isActive: true,
        module: {
          id: 11,
        },
      },
      // 11
      {
        year: 2024,
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1-e1V1X2x9Ag5moZYqSbeU2zAaQy_WYSe'
            : '14SN3D9ThTxMVM64unOwcf3IrNaVq5UOZ',
        isActive: true,
        module: {
          id: 12,
        },
      },
    ]

    const submoduleYearModuleData = [
      {
        name: 'Consejos',
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1fgW6OkSALuTlDbbx-Oo_T6sJyen0IlAy'
            : '1G32DPZYCFVLPwgYKNSDJRAdadw0u-Mhc',
        yearModule: {
          id: 1,
        },
      },

      {
        name: 'Consejos',
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1iF0PWlfs9ShHZNOW15qsN6hoYQHrjH8v'
            : '19ih-hfLXTOii11ajI1ERnE7J79TMfWq8',
        yearModule: { id: 2 },
      },

      {
        name: 'Consejos',
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1YO2MQ5fWNA3uTdqkkMMYCMRTA1LNQxWM'
            : '1oVhM0eH9KrboOjucHj0gK91S4Zk-rZJ8',
        yearModule: { id: 3 },
      },

      {
        name: 'Consejos',
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1Qi8PYjtm04i4nBE1QS4c8IKOM_SpMcSi'
            : '1S-mhFxAnGurT1F5pdaYWhN3wkEHWqfg5',
        yearModule: { id: 4 },
      },

      {
        name: 'Consejos',
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1mFhbt1x-4_DzCbdD9cCA-l8L08Nao1Xz'
            : '1mN5zigMN3GtMECSgaftTcMeA9t3-dA_d',
        yearModule: { id: 5 },
      },

      {
        name: 'Consejos',
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1CPM5KDhXVTv2jCbKyz-vYG3GNjlfiENo'
            : '1zFhjioI2sXybhMqEKa8uzOzcOeR_s-ok',
        yearModule: { id: 6 },
      },

      {
        name: 'Consejos',
        driveId:
          process.env.NODE_ENV === 'production'
            ? '122GU2F0WNV70dccHTBp9QlD2ASlmveD6'
            : '1t6HOXcRcas5cuGWneqSn0bP4sVZBRHfP',
        yearModule: { id: 7 },
      },

      {
        name: 'Consejos',
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1GX1keIbHClPiCYE2OUC2sBfczYL-4AWD'
            : '1r080Y4pFOgiODaLGU7YsdKmNmzYPoTun',
        yearModule: { id: 8 },
      },

      {
        name: 'Consejos',
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1bk5sO1qke-ltrirzN13UX3BZZTMuN0UD'
            : '1vOj_h6NAeHOekPKxw8YSv0fjIbb80tU_',
        yearModule: { id: 9 },
      },
      {
        name: 'Actas de grado',
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1UAVwkySFsU79hLGEeJahECSTdKK9d-Yb'
            : '1brUexewZ6HON8NYFWR1DbQ4zfmBLxhfU',
        yearModule: { id: 10 },
      },

      {
        name: 'Consejos',
        driveId:
          process.env.NODE_ENV === 'production'
            ? '1_2xDqP4n20xbOjP2MMbh3XnBSNxhJMRa'
            : '1iVcnqDVyj2CzD4HEQpuG50ad_UuTFGeY',
        yearModule: { id: 11 },
      },
    ]

    await queryRunner2.manager.save(
      yearModuleData.map((m) => yearModuleRepository.create(m)),
    )
    await queryRunner2.manager.save(
      submoduleYearModuleData.map((m) =>
        submoduleYearModuleRepository.create(m),
      ),
    )

    await queryRunner2.manager.save(
      certificateTypeData.map((c) => certificateTypeRepository.create(c)),
    )
    await queryRunner2.manager.save(
      certificateStatusData.map((c) => certificateStatusRepository.create(c)),
    )
    await queryRunner2.manager.save(
      degreeModalityData.map((d) => degreeModalityRepository.create(d)),
    )
    await queryRunner2.manager.save(
      certificateTypeCareerData.map((c) =>
        certificateTypeCareerRepository.create(c),
      ),
    )
    await queryRunner2.manager.save(
      cetificateTypeStatusData.map((c) =>
        cetificateTypeStatusRepository.create(c),
      ),
    )
    await queryRunner2.manager.save(
      cellGradeDegreeCertificateTypeData.map((c) =>
        cellsGradeCertificateTypeRepository.create(c),
      ),
    )
    await queryRunner2.manager.save(
      roomData.map((r) => roomRepository.create(r)),
    )

    await queryRunner2.commitTransaction()
    await queryRunner2.release()
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const connection = queryRunner.connection

    const yearModuleRepository = connection.getRepository(YearModuleEntity)
    const submoduleYearModuleRepository = connection.getRepository(
      SubmoduleYearModuleEntity,
    )

    await yearModuleRepository.delete({})
    await submoduleYearModuleRepository.delete({})
  }
}
