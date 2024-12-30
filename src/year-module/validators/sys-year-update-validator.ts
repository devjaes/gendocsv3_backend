import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Not, Repository } from 'typeorm'
import { SystemYearEntity } from '../entities/system-year.entity'
import { YearModuleAlreadyExists } from '../errors/year-module-already-exists'
import { DEGREE_CERTIFICATE } from '../../degree-certificates/constants'
import { DegreeCertificateRepository } from '../../degree-certificates/repositories/degree-certificate-repository'
import { Inject, Injectable, forwardRef } from '@nestjs/common'
import { CouncilEntity } from '../../councils/entities/council.entity'
import { NumerationDocumentEntity } from '../../numeration-document/entities/numeration-document.entity'
import { CouncilsNotClosedError } from '../errors/councils-not-closed'
import { NumerationState } from '../../shared/enums/numeration-state'
import { DocNumerationNotUsed } from '../errors/doc-numeration-not-used'
import { CertificateNumerationService } from '../../degree-certificates/services/certificate-numeration.service'
import { DegCertNumerationNotUsed } from '../errors/deg-cert-numeration-not-used'
import { CareerEntity } from '../../careers/entites/careers.entity'
import { DegreeCertificateNotClosedError } from '../errors/degree-certificate-not-closed'

@Injectable()
export class SysYearUpdateValidator {
  constructor(
    @InjectRepository(SystemYearEntity)
    private readonly systemYearRepository: Repository<SystemYearEntity>,

    @InjectRepository(CouncilEntity)
    private readonly councilRepository: Repository<CouncilEntity>,

    @Inject(DEGREE_CERTIFICATE.REPOSITORY)
    private readonly degreeCertificateRepository: DegreeCertificateRepository,

    @InjectRepository(NumerationDocumentEntity)
    private readonly numerationDocumentRepository: Repository<NumerationDocumentEntity>,

    @Inject(forwardRef(() => CertificateNumerationService))
    private readonly numDegCertService: CertificateNumerationService,
  ) {}

  async validateYear(year: number) {
    const currentYear = await this.systemYearRepository.findOneBy({
      currentYear: year,
    })

    if (currentYear) {
      throw new YearModuleAlreadyExists(
        `El sistema ya está configurado para el año ${year}`,
      )
    }

    if (currentYear) {
      throw new YearModuleAlreadyExists(
        `El sistema ya está configurado para el año ${year}`,
      )
    }
  }

  async validateCouncilsAreClosed(year: number) {
    const councils = await this.councilRepository.find({
      where: {
        isActive: true,
        isArchived: false,
        submoduleYearModule: {
          yearModule: {
            year,
          },
        },
      },
    })

    if (councils != null && councils.length > 0) {
      throw new CouncilsNotClosedError(councils)
    }
  }

  async validateNumDocAreUsed(year: number) {
    const numerations = await this.numerationDocumentRepository.find({
      where: {
        state: Not(NumerationState.USED),
        yearModule: {
          year,
        },
      },
    })

    if (numerations != null && numerations.length > 0) {
      throw new DocNumerationNotUsed(numerations)
    }
  }

  async validateDegCertAreClosed(year: number) {
    const degCerts = await this.degreeCertificateRepository.find({
      where: {
        submoduleYearModule: {
          yearModule: { year },
        },
        isClosed: false,
        deletedAt: IsNull(),
      },
    })

    if (degCerts != null && degCerts.length > 0) {
      throw new DegreeCertificateNotClosedError(degCerts)
    }
  }

  async validateNumDegCertAreUsed(year: number) {
    const degCerts = await this.degreeCertificateRepository.find({
      where: {
        submoduleYearModule: {
          yearModule: {
            year,
          },
        },
        deletedAt: IsNull(),
        number: IsNull(),
      },
    })

    if (degCerts != null && degCerts.length > 0) {
      const careers: CareerEntity[] = []

      degCerts.forEach((degCert) => {
        if (
          careers.find((career) => career.id === degCert.student.career.id) ==
          null
        ) {
          careers.push(degCert.student.career)
        }
      })

      const careerNumbersNotUsed: { careerName: string; numbers: number[] }[] =
        []

      const promises = careers.map(async (career) => {
        const numbers = await this.numDegCertService.getNumerationEnqueued(
          career.id,
        )

        careerNumbersNotUsed.push({
          careerName: career.name,
          numbers,
        })
      })

      await Promise.all(promises)

      throw new DegCertNumerationNotUsed(careerNumbersNotUsed)
    }
  }
}
