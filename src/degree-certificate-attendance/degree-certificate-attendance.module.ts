import { forwardRef, Module } from '@nestjs/common'
import { DegreeAttendanceService } from './degree-certificate-attendance.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DegreeCertificateAttendanceEntity } from './entities/degree-certificate-attendance.entity'
import { DegreeAttendanceController } from './degree-certificate-attendance.controller'
import { DegreeCertificatesModule } from '../degree-certificates/modules/degree-certificates.module'

@Module({
  controllers: [DegreeAttendanceController],
  providers: [DegreeAttendanceService],
  imports: [
    TypeOrmModule.forFeature([DegreeCertificateAttendanceEntity]),
    forwardRef(() => DegreeCertificatesModule),
  ],
  exports: [DegreeAttendanceService],
})
export class DegreeCertificateAttendanceModule {}
