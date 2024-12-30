import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DEGREE_CERTIFICATE } from '../constants'
import { DegreeCertificateRepository } from '../repositories/degree-certificate-repository'
import { DegreeCertificatesService } from './degree-certificates.service'
import { DEGREE_MODULES } from '../../shared/enums/degree-certificates'
import { Not, IsNull, MoreThan } from 'typeorm'
import { ApiResponseDto } from '../../shared/dtos/api-response.dto'
import { DegreeCertificateNotFoundError } from '../errors/degree-certificate-not-found'
import { CertificateDocumentService } from './certificate-document.service'
import { DEGREE_CERT_CURRENT_NUMERATIONS } from '../../shared/constants/degree-cert-current-numerations'
import { DegreeCertificateEntity } from '../entities/degree-certificate.entity'
import { formatDateTime } from '../../shared/utils/date'
import { NotificationsGateway } from '../../notifications/notifications.gateway'
import { YearModuleService } from '../../year-module/services/year-module.service'

@Injectable()
export class CertificateNumerationService {
  constructor(
    @Inject(forwardRef(() => DegreeCertificatesService))
    private readonly degreeCertificatesService: DegreeCertificatesService,
    @Inject(DEGREE_CERTIFICATE.REPOSITORY)
    private readonly degreeCertificateRepository: DegreeCertificateRepository,
    private readonly yearModuleService: YearModuleService,
    private readonly certificateDocumentService: CertificateDocumentService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async getLastNumberToRegister(carrerId: number): Promise<number> {
    const systemYear = await this.yearModuleService.getCurrentSystemYear()

    const submoduleYearModule =
      await this.yearModuleService.findSubmoduleYearModuleByModule(
        DEGREE_MODULES.MODULE_CODE,
        systemYear,
        DEGREE_MODULES.SUBMODULE_NAME,
      )

    const enqueuedNumbers = await this.getNumerationEnqueued(carrerId)

    if (enqueuedNumbers.length > 0) {
      return enqueuedNumbers[0]
    }

    const lastDegreeCertificate =
      await this.degreeCertificateRepository.findOneFor({
        where: {
          submoduleYearModule: { id: submoduleYearModule.id },
          career: { id: carrerId },
        },
        order: { auxNumber: 'DESC' },
      })

    const number = lastDegreeCertificate
      ? lastDegreeCertificate.auxNumber + 1
      : 1

    return number
  }

  async getLastNumberGenerated(
    careerId: number,
    submoduleYearModuleId: number,
  ) {
    const degreeCertificate = await this.degreeCertificateRepository.findOneFor(
      {
        where: {
          career: { id: careerId },
          submoduleYearModule: { id: submoduleYearModuleId },
          number: Not(IsNull()),
          deletedAt: IsNull(),
        },
        order: { number: 'DESC' },
      },
    )

    if (degreeCertificate == null || !degreeCertificate.number) {
      const currentSystemYear =
        await this.yearModuleService.getCurrentSystemYear()

      if (currentSystemYear === 2024) {
        return DEGREE_CERT_CURRENT_NUMERATIONS[careerId]
      }
      return 0
    }

    return degreeCertificate.number
  }

  async getNumerationEnqueued(careerId: number): Promise<number[]> {
    const submoduleYearModule =
      await this.degreeCertificatesService.getCurrentDegreeSubmoduleYearModule()

    const { degreeCertificates: removedDegreeCertificates } =
      await this.degreeCertificateRepository.findManyFor({
        where: {
          career: { id: careerId },
          submoduleYearModule: { id: submoduleYearModule.id },
          number: Not(IsNull()),
          deletedAt: Not(IsNull()),
        },

        order: { number: 'ASC' },
      })

    const numbers: number[] = []

    if (removedDegreeCertificates) {
      const promises = removedDegreeCertificates.map(
        async (degreeCertificate) => {
          const usedNumberDegreeCertificate =
            await this.degreeCertificateRepository.findOneFor({
              where: {
                career: { id: careerId },
                submoduleYearModule: { id: submoduleYearModule.id },
                number: degreeCertificate.number,
                deletedAt: IsNull(),
              },
            })

          if (usedNumberDegreeCertificate != null) {
            return
          }

          numbers.push(degreeCertificate.number)
        },
      )

      await Promise.all(promises)
    }

    return numbers
  }

  async generateNumeration(careerId: number) {
    const submoduleYearModule =
      await this.degreeCertificatesService.getCurrentDegreeSubmoduleYearModule()

    const enqueuedNumbers = await this.getNumerationEnqueued(careerId)

    if (enqueuedNumbers.length > 0) {
      await this.notificationsGateway.handleSendWarning({
        title: 'Aviso - Numeración encolada',
        message: `AVISO - Existen números de actas encolados, se recomienda asignarlos lo antes posible para evitar errores en la numeración de actas. Contacta al administrador del sistema para más información`,
      })
    }

    const degreeCertificates =
      await this.certificateDocumentService.getCertificatesToGenerate(
        careerId,
        submoduleYearModule.id,
      )

    if (!degreeCertificates) {
      throw new DegreeCertificateNotFoundError(
        'No se encontraron certificados para generar la numeración, verifique que los certificados tengan fecha de presentación',
      )
    }

    const lastNumber = await this.getLastNumberGenerated(
      careerId,
      submoduleYearModule.id,
    )

    let number = lastNumber

    await this.verifyLastNumberatedAndPresentationDate({
      careerId,
      submoduleYearModuleId: submoduleYearModule.id,
      degreeCertificates,
      number: lastNumber,
    })

    for (const degreeCertificate of degreeCertificates) {
      number += 1

      await this.degreeCertificateRepository.save({
        ...degreeCertificate,
        number,
      })
    }

    return new ApiResponseDto('Numeración generada correctamente', {
      firstGenerated: lastNumber + 1,
      lastGenerated: number,
    })
  }

  async verifyLastNumberatedAndPresentationDate({
    careerId,
    submoduleYearModuleId,
    degreeCertificates,
    number,
    isEnqueued = false,
  }: {
    careerId: number
    submoduleYearModuleId: number
    degreeCertificates: DegreeCertificateEntity[]
    number: number
    isEnqueued?: boolean
  }) {
    if (isEnqueued) {
      const nextDegreeCertificatesAfterEnqueuedNumber =
        await this.degreeCertificateRepository.findManyFor({
          where: {
            career: { id: careerId },
            submoduleYearModule: { id: submoduleYearModuleId },
            number: MoreThan(number),
            deletedAt: IsNull(),
          },
          order: { number: 'ASC' },
        })

      if (
        nextDegreeCertificatesAfterEnqueuedNumber.degreeCertificates.length ===
        0
      ) {
        return
      }

      const nextDegreeCertificate =
        nextDegreeCertificatesAfterEnqueuedNumber.degreeCertificates[0]

      if (
        nextDegreeCertificate &&
        nextDegreeCertificate.presentationDate &&
        new Date(nextDegreeCertificate.presentationDate).getDate() <
          new Date(degreeCertificates[0].presentationDate).getDate()
      ) {
        throw new DegreeCertificateNotFoundError(
          `Para el número de acta encolado: ${number} la fecha de presentación ${formatDateTime(
            degreeCertificates[0].presentationDate,
          )} debe ser menor a la fecha de presentación del siguiente acta numerada: ${
            nextDegreeCertificate.number
          } - ${formatDateTime(nextDegreeCertificate.presentationDate)}`,
        )
      }

      return
    }

    const lastDegreeCertificate =
      await this.degreeCertificateRepository.findOneFor({
        where: {
          career: { id: careerId },
          submoduleYearModule: { id: submoduleYearModuleId },
          number,
        },
      })

    if (!lastDegreeCertificate) {
      return
    }

    if (!lastDegreeCertificate.presentationDate) {
      throw new DegreeCertificateNotFoundError(
        'La fecha de presentación del acta de grado no ha sido registrada',
      )
    }

    const lastPresentationDate = lastDegreeCertificate.presentationDate

    for (const degreeCertificate of degreeCertificates) {
      const sameMonthAndYear =
        new Date(degreeCertificate.presentationDate).getMonth() ===
          new Date(lastPresentationDate).getMonth() &&
        new Date(degreeCertificate.presentationDate).getFullYear() ===
          new Date(lastPresentationDate).getFullYear()

      if (
        !lastDegreeCertificate.deletedAt &&
        sameMonthAndYear &&
        new Date(degreeCertificate.presentationDate).getDate() <
          new Date(lastPresentationDate).getDate()
      ) {
        throw new DegreeCertificateNotFoundError(
          `La fecha de presentación del acta para estudiante con cédula: ${degreeCertificate.student.dni} es menor a la fecha de presentación de la última acta numerada`,
        )
      }
    }
  }
}
