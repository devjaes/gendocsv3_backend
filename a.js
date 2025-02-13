'use strict'
const __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    const c = arguments.length
    let r =
      c < 3
        ? target
        : desc === null
        ? (desc = Object.getOwnPropertyDescriptor(target, key))
        : desc
    let d
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function') {
      r = Reflect.decorate(decorators, target, key, desc)
    } else {
      for (let i = decorators.length - 1; i >= 0; i--) {
        if ((d = decorators[i])) {
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r
        }
      }
    }
    return c > 3 && r && Object.defineProperty(target, key, r), r
  }
const __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function') {
      return Reflect.metadata(k, v)
    }
  }
const __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex)
    }
  }
let CertificateBulkService_1
Object.defineProperty(exports, '__esModule', { value: true })
exports.CertificateBulkService = void 0
const common_1 = require('@nestjs/common')
const degree_certificates_service_1 = require('./degree-certificates.service')
const students_service_1 = require('../../students/students.service')
const certificate_type_service_1 = require('./certificate-type.service')
const functionaries_service_1 = require('../../functionaries/functionaries.service')
const certificate_status_service_1 = require('./certificate-status.service')
const degree_modalities_service_1 = require('./degree-modalities.service')
const degree_certificate_repository_1 = require('../repositories/degree-certificate-repository')
const constants_1 = require('../constants')
const degree_certificate_attendance_service_1 = require('../../degree-certificate-attendance/degree-certificate-attendance.service')
const degree_certificates_1 = require('../../shared/enums/degree-certificates')
const student_entity_1 = require('../../students/entities/student.entity')
const grades_sheet_service_1 = require('./grades-sheet.service')
const errors_bulk_certificate_1 = require('../errors/errors-bulk-certificate')
const bull_1 = require('@nestjs/bull')
const notifications_service_1 = require('../../notifications/notifications.service')
const notifications_gateway_1 = require('../../notifications/notifications.gateway')
const roles_1 = require('../../shared/constants/roles')
const notification_status_1 = require('../../shared/enums/notification-status')
const certificate_numeration_service_1 = require('./certificate-numeration.service')
const date_1 = require('../../shared/utils/date')
const module_entity_1 = require('../../modules/entities/module.entity')
const error_1 = require('../../shared/utils/error')
const string_1 = require('../../shared/utils/string')
const certificate_validator_1 = require('../validators/certificate-validator')
let CertificateBulkService =
  exports.CertificateBulkService =
  CertificateBulkService_1 =
    class CertificateBulkService {
      constructor(
        certificateQueue,
        degreeCertificateService,
        studentsService,
        certiticateTypeService,
        functionariesService,
        certificateStatusService,
        degreeModalitiesService,
        degreeCertificateAttendanceService,
        gradesSheetService,
        notificationsService,
        certificateNumerationService,
        notificationsGateway,
        validator,
        degreeCertificateRepository,
      ) {
        this.certificateQueue = certificateQueue
        this.degreeCertificateService = degreeCertificateService
        this.studentsService = studentsService
        this.certiticateTypeService = certiticateTypeService
        this.functionariesService = functionariesService
        this.certificateStatusService = certificateStatusService
        this.degreeModalitiesService = degreeModalitiesService
        this.degreeCertificateAttendanceService =
          degreeCertificateAttendanceService
        this.gradesSheetService = gradesSheetService
        this.notificationsService = notificationsService
        this.certificateNumerationService = certificateNumerationService
        this.notificationsGateway = notificationsGateway
        this.validator = validator
        this.degreeCertificateRepository = degreeCertificateRepository
        this.logger = new common_1.Logger(CertificateBulkService_1.name)
      }
      async createBulkCertificates(createCertificatesDtos, userId, retryId) {
        const degreeCertificatesModule =
          await module_entity_1.ModuleEntity.findOne({
            where: { code: 'COMM' },
          })
        if (!degreeCertificatesModule) {
          throw new Error('No se encontró el módulo de actas de grado')
        }
        this.logger.log('Creando certificados de grado en lote...')
        const rootNotification = await this.notificationsService.create({
          isMain: true,
          name: `${retryId ? 'Reitento-' : ''}Carga de actas de grado ${(0,
          date_1.formatDateTime)(new Date(Date.now())).toString()}`,
          createdBy: userId,
          retryId,
          scope: {
            modules: [degreeCertificatesModule.id],
            roles: [roles_1.RolesType.ADMIN, roles_1.RolesType.TEMP_ADMIN],
            id: userId,
          },
          status: notification_status_1.NotificationStatus.IN_PROGRESS,
          type: 'createBulkCertificates',
        })
        if (!rootNotification) {
          throw Error('No se pudo crear la notificación')
        }
        this.notificationsGateway.handleSendNotification(rootNotification)
        const childs = retryId
          ? await this.notificationsService.notificationsByParent(retryId)
          : undefined
        const promises = createCertificatesDtos.map(async (dto) => {
          const job = await this.certificateQueue.add(
            'createCertificate',
            { notification: rootNotification, dto, retries: childs },
            {
              attempts: 2,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
            },
          )
          return job.finished()
        })
        await Promise.all(promises)
        await this.certificateQueue.whenCurrentJobsFinished()
        const notifications =
          await this.notificationsService.notificationsByParent(
            rootNotification.id,
          )
        const completedWithoutErrors = notifications.filter(
          (notification) =>
            notification.status ===
            notification_status_1.NotificationStatus.COMPLETED,
        )
        let savedRootNotification
        if (completedWithoutErrors.length === createCertificatesDtos.length) {
          rootNotification.status =
            notification_status_1.NotificationStatus.COMPLETED
          savedRootNotification = await rootNotification.save()
        } else if (
          completedWithoutErrors.length < createCertificatesDtos.length &&
          completedWithoutErrors.length > 0
        ) {
          rootNotification.status =
            notification_status_1.NotificationStatus.WITH_ERRORS
          savedRootNotification = await rootNotification.save()
        } else {
          rootNotification.status =
            notification_status_1.NotificationStatus.FAILURE
          savedRootNotification = await rootNotification.save()
        }
        if (rootNotification.retryId && completedWithoutErrors.length > 0) {
          await this.notificationsService.update(rootNotification.retryId, {
            status: notification_status_1.NotificationStatus.COMPLETED,
          })
        }
        this.notificationsGateway.handleSendNotification({
          notification: savedRootNotification,
          childs: notifications,
        })
      }
      async createDegreeCertificate(
        createCertificateDto,
        notification,
        retries,
      ) {
        this.logger.log('Creando un certificado de grado...')
        const studentToFillName = await student_entity_1.StudentEntity.findOne({
          where: { dni: createCertificateDto.studentDni },
        })
        const notificationBaseName = `Acta de grado -${
          createCertificateDto.studentDni
        }
      ${
        studentToFillName != null
          ? (0, string_1.getFullName)(studentToFillName)
          : ''
      }`
        let childNotification
        const prev = retries?.find((r) => r.name.includes(notificationBaseName))
        if (notification.retryId) {
          if (prev) {
            childNotification = await this.notificationsService.create({
              createdBy: notification.createdBy.id,
              name: `${
                prev.status ===
                notification_status_1.NotificationStatus.COMPLETED
                  ? 'Completa_Anterior-'
                  : prev.status ===
                    notification_status_1.NotificationStatus.WITH_ERRORS
                  ? 'Actualizando-'
                  : 'Reintentando-'
              }${notificationBaseName}`,
              type: 'createDegreeCertificate',
              status:
                prev.status ===
                notification_status_1.NotificationStatus.COMPLETED
                  ? notification_status_1.NotificationStatus.COMPLETED
                  : notification_status_1.NotificationStatus.IN_PROGRESS,
              data: JSON.stringify({ dto: createCertificateDto }),
              parentId: notification.id,
            })
            if (
              childNotification.status ===
              notification_status_1.NotificationStatus.COMPLETED
            ) {
              return { errors: [] }
            }
            const prevData = JSON.parse(prev.data)
            if (prevData.entities.degreeCertificate) {
              const degreeCertificate =
                await this.degreeCertificateRepository.findOne({
                  where: {
                    id: prevData.entities.degreeCertificate.id,
                  },
                })
              if (degreeCertificate) {
                await this.degreeCertificateService.remove(degreeCertificate.id)
              }
            }
          }
        } else if (
          !notification.retryId ||
          prev.status === notification_status_1.NotificationStatus.FAILURE
        ) {
          childNotification = await this.notificationsService.create({
            createdBy: notification.createdBy.id,
            name: notificationBaseName,
            type: 'createDegreeCertificate',
            status: notification_status_1.NotificationStatus.IN_PROGRESS,
            data: JSON.stringify({ dto: createCertificateDto }),
            parentId: notification.id,
          })
        }
        if (!childNotification) {
          throw Error('No se pudo crear la notificación')
        }
        const errors = []
        const students = await this.validateStudent(
          createCertificateDto.studentDni,
          errors,
        )
        if (errors.length > 0) {
          this.logger.error(errors)
          const messages = errors.map((e) => e.detail)
          await this.notificationsService.updateFailureMsg(
            childNotification.id,
            messages,
          )
          return { errors }
        }
        const certificateType = await this.validateCertificateType(
          createCertificateDto.certificateType,
          students.students[0].career.id,
          errors,
        )
        const certificateStatus = await this.validateCertificateStatus(
          createCertificateDto.certificateStatus,
          errors,
        )
        const degreeModality =
          createCertificateDto.link !== '' && createCertificateDto.link != null
            ? constants_1.DEGREE_MODALITY.ONLINE
            : constants_1.DEGREE_MODALITY.PRESENCIAL
        const degreeModalityEntity = await this.validateDegreeModality(
          degreeModality,
          errors,
        )
        if (errors.length > 0) {
          this.logger.error(errors)
          const messages = errors.map((e) => e.detail)
          await this.notificationsService.updateFailureMsg(
            childNotification.id,
            messages,
          )
          return { errors }
        }
        try {
          const { degreeCertificate, errors: degreeCertificateErrors } =
            await this.validateCertificate({
              createCertificateDto,
              student: students.students[0],
              certificateType,
              certificateStatus,
              degreeModalityEntity,
              userId: notification.createdBy.id,
              errors,
            })
          if (degreeCertificateErrors.length > 0) {
            const messages = errors.map((e) => e.detail)
            await this.notificationsService.updateFailureMsg(
              childNotification.id,
              messages,
            )
            return { errors }
          }
          if (
            !await this.generateGradesSheet(
              degreeCertificate,
              createCertificateDto.gradesDetails,
              errors,
              createCertificateDto.curriculumGrade,
            )
          ) {
            const messages = errors.map((e) => e.detail)
            await degreeCertificate.remove()
            await this.notificationsService.updateFailureMsg(
              childNotification.id,
              messages,
            )
            return { errors }
          }
          const attendance = await this.generateAttendance(
            createCertificateDto,
            degreeCertificate,
            errors,
          )
          this.logger.log({ degreeCertificate, attendance, errors })
          if (errors.length > 0) {
            const messages = errors.map((e) => e.detail)
            await this.notificationsService.update(childNotification.id, {
              messages,
              status: notification_status_1.NotificationStatus.WITH_ERRORS,
              data: JSON.stringify({
                dto: createCertificateDto,
                entities: {
                  degreeCertificate,
                  attendance,
                },
              }),
            })
            return { degreeCertificate, attendance, errors }
          }
          await this.notificationsService.update(childNotification.id, {
            status: notification_status_1.NotificationStatus.COMPLETED,
          })
          return { degreeCertificate, attendance, errors }
        } catch (error) {
          if (
            error.code &&
            error.code === common_1.HttpStatus.TOO_MANY_REQUESTS
          ) {
            throw new Error('Temporary Google API error, retrying...')
          }
          this.logger.error(error)
          console.error(error)
          errors.push(
            new errors_bulk_certificate_1.ExceptionSimpleDetail(
              'No se pudo crear el certificado de grado',
              error.stack,
            ),
          )
          const messages = errors.map((e) => e.detail)
          await this.notificationsService.updateFailureMsg(
            notification.id,
            messages,
          )
          return { errors }
        }
      }
      async validateCertificate({
        createCertificateDto,
        student,
        certificateType,
        certificateStatus,
        degreeModalityEntity,
        userId,
        errors,
      }) {
        let degreeCertificate
        degreeCertificate =
          await this.degreeCertificateRepository.findReplicate(student.id)
        const degreeCertificateData = await this.getDegreeCertificateData({
          createCertificateDto,
          studentId: student.id,
          careerId: student.career.id,
          certificateTypeId: certificateType.id,
          degreeModalityId: degreeModalityEntity.id,
          certificateStatusId: certificateStatus.id,
          userId,
          degreeCertificate,
        })
        if (degreeCertificate == null || degreeCertificate === undefined) {
          degreeCertificate = this.degreeCertificateRepository.create(
            degreeCertificateData,
          )
          if (!degreeCertificate) {
            errors.push(
              new errors_bulk_certificate_1.ExceptionSimpleDetail(
                'Los datos del certificado son incorrectos',
                new Error().stack,
              ),
            )
            return { errors }
          }
          degreeCertificate = await this.degreeCertificateRepository.save(
            degreeCertificate,
          )
        } else {
          degreeCertificate = await this.degreeCertificateRepository.save({
            ...degreeCertificate,
            ...degreeCertificateData,
          })
          if (!degreeCertificate) {
            errors.push(
              new errors_bulk_certificate_1.ExceptionSimpleDetail(
                'Los datos del certificado son incorrectos',
                new Error().stack,
              ),
            )
            return { errors }
          }
        }
        degreeCertificate = await this.degreeCertificateRepository.findOneFor({
          where: { id: degreeCertificate.id },
        })
        return { degreeCertificate, errors }
      }
      async validateStudent(studentDni, errors) {
        try {
          const { data: students } = await this.studentsService.findByFilters({
            field: studentDni,
            state: true,
          })
          if (!students || students.count === 0) {
            errors.push(
              new errors_bulk_certificate_1.ExceptionSimpleDetail(
                `No existe el estudiante con cédula${studentDni}`,
                new Error().stack,
              ),
            )
          }
          await this.validator.checkStudent(students.students[0])
          return students
        } catch (error) {
          const msg =
            error.message.message ||
            error.message.detail ||
            error.detail ||
            error.message ||
            `No se pudo obtener el estudiante con cédula ${studentDni}`
          errors.push(
            new errors_bulk_certificate_1.ExceptionSimpleDetail(
              msg,
              error.stack,
            ),
          )
          this.logger.debug(`${msg}`)
        }
      }
      async validateCertificateType(certificateType, careerId, errors) {
        let certificateTypeEntity
        try {
          certificateTypeEntity =
            await this.certiticateTypeService.findCertificateTypeByNameAndCareer(
              certificateType.toUpperCase(),
              careerId,
            )
        } catch (error) {
          errors.push(
            new errors_bulk_certificate_1.ExceptionSimpleDetail(
              `No existe el tipo de certificado ${certificateType}`,
              error.stack,
            ),
          )
        }
        return certificateTypeEntity
      }
      async validateCertificateStatus(certificateStatus, errors) {
        let certificateStatusEntity
        const certificateTypeStatusCode = (0,
        degree_certificates_1.getSTATUS_CODE_BY_CERT_STATUS)(certificateStatus)
        try {
          certificateStatusEntity =
            await this.certificateStatusService.findCertificateStatusByCode(
              certificateTypeStatusCode,
            )
        } catch (error) {
          errors.push(
            new errors_bulk_certificate_1.ExceptionSimpleDetail(
              `No existe el estado de certificado ${certificateStatus}`,
              error.stack,
            ),
          )
        }
        return certificateStatusEntity
      }
      async validateDegreeModality(degreeModality, errors) {
        let degreeModalityEntity
        try {
          degreeModalityEntity =
            await this.degreeModalitiesService.findDegreeModalityByCode(
              degreeModality,
            )
        } catch (error) {
          errors.push(
            new errors_bulk_certificate_1.ExceptionSimpleDetail(
              `No existe la modalidad de grado ${degreeModality}`,
              error.stack,
            ),
          )
        }
        return degreeModalityEntity
      }
      async getDegreeCertificateData({
        createCertificateDto,
        studentId,
        careerId,
        certificateTypeId,
        degreeModalityId,
        certificateStatusId,
        userId,
        degreeCertificate,
      }) {
        return {
          auxNumber:
            degreeCertificate != null
              ? degreeCertificate.auxNumber
              : await this.certificateNumerationService.getLastNumberToRegister(
                  careerId,
                ),
          topic: createCertificateDto.topic,
          student: { id: studentId },
          career: { id: careerId },
          certificateType: { id: certificateTypeId },
          certificateStatus: { id: certificateStatusId },
          degreeModality: { id: degreeModalityId },
          link:
            createCertificateDto.link !== '' ||
            createCertificateDto.link != null
              ? createCertificateDto.link
              : undefined,
          submoduleYearModule: {
            id: (
              await this.degreeCertificateService.getCurrentDegreeSubmoduleYearModule()
            ).id,
          },
          duration: 60,
          user: { id: userId },
          changeUniversityResolution:
            createCertificateDto.changeUniversityResolution,
          changeUniversityName: createCertificateDto.changeUniversityName,
          changeUniversityDate: createCertificateDto.changeUniversityDate,
        }
      }
      async generateAttendance(
        createCertificateDto,
        degreeCertificate,
        errors,
      ) {
        const attendance = []
        try {
          await this.degreeCertificateAttendanceService.removeAllAttendanceByDegreeCertificateId(
            degreeCertificate.id,
          )
          const { data: firstMainQualifier } =
            await this.functionariesService.findByFilters({
              field: createCertificateDto.firstMainQualifierDni,
              state: true,
            })
          if (firstMainQualifier.count === 0) {
            errors.push(
              new errors_bulk_certificate_1.ExceptionSimpleDetail(
                `No existe el calificador principal con cédula ${createCertificateDto.firstMainQualifierDni}`,
                new Error().stack,
              ),
            )
          }
          const { data: firstAttendance } =
            await this.degreeCertificateAttendanceService.create({
              assignationDate: new Date(),
              degreeCertificateId: degreeCertificate.id,
              functionaryId: firstMainQualifier.functionaries[0].id,
              details: createCertificateDto.qualifiersResolution,
              role: degree_certificates_1.DEGREE_ATTENDANCE_ROLES.PRINCIPAL,
            })
          attendance.push(firstAttendance)
          const { data: secondMainQualifier } =
            await this.functionariesService.findByFilters({
              field: createCertificateDto.secondMainQualifierDni,
              state: true,
            })
          if (secondMainQualifier.count === 0) {
            errors.push(
              new errors_bulk_certificate_1.ExceptionSimpleDetail(
                `No existe el calificador principal con cédula ${createCertificateDto.secondMainQualifierDni}`,
                new Error().stack,
              ),
            )
          }
          const { data: secondAttendance } =
            await this.degreeCertificateAttendanceService.create({
              assignationDate: new Date(),
              degreeCertificateId: degreeCertificate.id,
              functionaryId: secondMainQualifier.functionaries[0].id,
              details: createCertificateDto.qualifiersResolution,
              role: degree_certificates_1.DEGREE_ATTENDANCE_ROLES.PRINCIPAL,
            })
          attendance.push(secondAttendance)
          if (createCertificateDto.firstSecondaryQualifierDni) {
            const { data: firstSecondaryQualifier } =
              await this.functionariesService.findByFilters({
                field: createCertificateDto.firstSecondaryQualifierDni,
                state: true,
              })
            if (firstSecondaryQualifier.count === 0) {
              errors.push(
                new errors_bulk_certificate_1.ExceptionSimpleDetail(
                  `No existe el calificador secundario con cédula ${createCertificateDto.firstSecondaryQualifierDni}`,
                  new Error().stack,
                ),
              )
            }
            const { data: firstSecondaryAttendance } =
              await this.degreeCertificateAttendanceService.create({
                assignationDate: new Date(),
                degreeCertificateId: degreeCertificate.id,
                functionaryId: firstSecondaryQualifier.functionaries[0].id,
                details: 'POR DEFINIR',
                role: degree_certificates_1.DEGREE_ATTENDANCE_ROLES.SUBSTITUTE,
              })
            attendance.push(firstSecondaryAttendance)
          }
          if (createCertificateDto.secondSecondaryQualifierDni) {
            const { data: secondSecondaryQualifier } =
              await this.functionariesService.findByFilters({
                field: createCertificateDto.secondSecondaryQualifierDni,
                state: true,
              })
            if (secondSecondaryQualifier.count === 0) {
              errors.push(
                new errors_bulk_certificate_1.ExceptionSimpleDetail(
                  `No existe el calificador secundario con cédula ${createCertificateDto.secondSecondaryQualifierDni}`,
                  new Error().stack,
                ),
              )
            }
            const { data: secondSecondaryAttendance } =
              await this.degreeCertificateAttendanceService.create({
                assignationDate: new Date(),
                degreeCertificateId: degreeCertificate.id,
                functionaryId: secondSecondaryQualifier.functionaries[0].id,
                details: 'POR DEFINIR',
                role: degree_certificates_1.DEGREE_ATTENDANCE_ROLES.SUBSTITUTE,
              })
            attendance.push(secondSecondaryAttendance)
          }
          const { data: tutor } = await this.functionariesService.findByFilters(
            {
              field: createCertificateDto.mentorDni,
              state: true,
            },
          )
          if (tutor.count === 0) {
            errors.push(
              new errors_bulk_certificate_1.ExceptionSimpleDetail(
                `No existe el tutor con cédula ${createCertificateDto.mentorDni}`,
                new Error().stack,
              ),
            )
          }
          const { data: tutorAttendance } =
            await this.degreeCertificateAttendanceService.create({
              assignationDate: new Date(),
              degreeCertificateId: degreeCertificate.id,
              functionaryId: tutor.functionaries[0].id,
              details: 'POR DEFINIR',
              role: degree_certificates_1.DEGREE_ATTENDANCE_ROLES.MENTOR,
            })
          attendance.push(tutorAttendance)
          return attendance
        } catch (error) {
          errors.push(
            new errors_bulk_certificate_1.ExceptionSimpleDetail(
              error instanceof error_1.BaseError
                ? error.detail
                : 'No se pudo actualizar la asistencia al acta de grado',
              error.stack,
            ),
          )
        }
      }
      async generateGradesSheet(
        degreeCertificate,
        gradesDetails,
        errors,
        curriculumGrade,
      ) {
        if (degreeCertificate.gradesSheetDriveId != null) {
          const revoked = await this.gradesSheetService.revokeGradeSheet(
            degreeCertificate,
          )
          if (!revoked) {
            errors.push(
              new errors_bulk_certificate_1.ExceptionSimpleDetail(
                'No se pudo anular la hoja de calificaciones',
                new Error().stack,
              ),
            )
          }
        }
        const foundCertificate =
          await this.degreeCertificateRepository.findOneFor({
            where: { id: degreeCertificate.id },
          })
        if (!foundCertificate) {
          errors.push(
            new errors_bulk_certificate_1.ExceptionSimpleDetail(
              'No se encontró el certificado de grado',
              new Error().stack,
            ),
          )
          return false
        }
        const { data: degreeUpdated } =
          await this.gradesSheetService.generateGradeSheet(foundCertificate)
        if (!degreeUpdated) {
          errors.push(
            new errors_bulk_certificate_1.ExceptionSimpleDetail(
              'No se pudo generar la hoja de calificaciones',
              new Error().stack,
            ),
          )
          return false
        }
        try {
          const gradesVariables =
            await this.gradesSheetService.getGradeCellsByCertificateType(
              degreeCertificate.certificateType.id,
            )
          const processedGradesDetails = this.processGradesDetails(
            gradesDetails,
            curriculumGrade,
          )
          const matchedGradesVariables = gradesVariables.filter((cell) =>
            processedGradesDetails.find(
              (grade) => grade.variable === cell.gradeVariable,
            ),
          )
          if (matchedGradesVariables.length !== processedGradesDetails.length) {
            errors.push(
              new errors_bulk_certificate_1.ExceptionSimpleDetail(
                `No se encontraron todas las variables de notas en la hoja de calificaciones: variables encontradas: ${matchedGradesVariables}, variables esperadas: ${processedGradesDetails}, revise las variables de notas en el tipo de acta seleccionado: ${degreeCertificate.certificateType.name}`,
                new Error().stack,
              ),
            )
          }
          const valuesToReplace = matchedGradesVariables.map((cell) => {
            const grade = processedGradesDetails.find(
              (grade) => grade.variable === cell.gradeVariable,
            )
            return [cell.cell, grade.value]
          })
          try {
            const { error } =
              await this.gradesSheetService.replaceCellsVariables({
                cellsVariables: valuesToReplace,
                gradesSheetDriveId: degreeUpdated.gradesSheetDriveId,
              })
            if (error) {
              errors.push(
                new errors_bulk_certificate_1.ExceptionSimpleDetail(
                  'No se pudo reemplazar las variables de notas',
                  error.stack,
                ),
              )
            }
            return true
          } catch (error) {
            if (
              error.code &&
              error.code === common_1.HttpStatus.TOO_MANY_REQUESTS
            ) {
              throw new common_1.HttpException(
                'Temporary Google API error, retrying...',
                common_1.HttpStatus.TOO_MANY_REQUESTS,
              )
            }
            errors.push(
              new errors_bulk_certificate_1.ExceptionSimpleDetail(
                'No se pudo reemplazar las variables de notas',
                error.stack,
              ),
            )
          }
        } catch (error) {
          if (
            error.code &&
            error.code === common_1.HttpStatus.TOO_MANY_REQUESTS
          ) {
            throw new common_1.HttpException(
              'Temporary Google API error, retrying...',
              common_1.HttpStatus.TOO_MANY_REQUESTS,
            )
          }
          errors.push(
            new errors_bulk_certificate_1.ExceptionSimpleDetail(
              'No se pudo obtener las variables de notas',
              error.stack,
            ),
          )
        }
      }
      processGradesDetails(gradesDetails, curriculumGrade) {
        const grades = gradesDetails.split(';')
        const gradesData = grades.map((grade) => {
          const [variable, value] = grade.split('=')
          return { variable, value }
        })
        gradesData.push({
          variable: 'NOTAMALLA',
          value: curriculumGrade ? curriculumGrade : '0.0',
        })
        return gradesData
      }
    }
exports.CertificateBulkService =
  CertificateBulkService =
  CertificateBulkService_1 =
    __decorate(
      [
        (0, common_1.Injectable)(),
        __param(0, (0, bull_1.InjectQueue)(constants_1.CERTIFICATE_QUEUE_NAME)),
        __param(13, (0, common_1.Inject)('DegreeCertificateRepository')),
        __metadata('design:paramtypes', [
          Object,
          degree_certificates_service_1.DegreeCertificatesService,
          students_service_1.StudentsService,
          certificate_type_service_1.CertificateTypeService,
          functionaries_service_1.FunctionariesService,
          certificate_status_service_1.CertificateStatusService,
          degree_modalities_service_1.DegreeModalitiesService,
          degree_certificate_attendance_service_1.DegreeAttendanceService,
          grades_sheet_service_1.GradesSheetService,
          notifications_service_1.NotificationsService,
          certificate_numeration_service_1.CertificateNumerationService,
          notifications_gateway_1.NotificationsGateway,
          certificate_validator_1.CertificateValidator,
          degree_certificate_repository_1.DegreeCertificateRepository,
        ]),
      ],
      CertificateBulkService,
    )
// # sourceMappingURL=certificate-bulk.service.js.maproot@239ff96683f1:/app/dist/degree-certificates/serv
