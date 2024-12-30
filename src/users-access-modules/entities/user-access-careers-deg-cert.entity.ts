import { CareerEntity } from '../../careers/entites/careers.entity'
import { UserEntity } from '../../users/entities/users.entity'
import {
  BaseEntity,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('users_access_careers_deg_cert')
export class UserAccessCareerDegCertEntity extends BaseEntity {
  @PrimaryColumn({
    name: 'user_id',
  })
  userId: number

  @PrimaryColumn({
    name: 'career_id',
  })
  careerId: number

  @ManyToOne(() => UserEntity, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user: UserEntity[]

  @ManyToOne(() => CareerEntity, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({
    name: 'career_id',
    referencedColumnName: 'id',
  })
  career: CareerEntity[]

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date
}
