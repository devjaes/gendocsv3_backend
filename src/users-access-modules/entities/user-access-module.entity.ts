import { ModuleEntity } from '../../modules/entities/modules.entity'
import { UserEntity } from '../../users/entities/users.entity'
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('users_access_modules')
export class UserAccessModuleEntity {
  @PrimaryColumn({
    name: 'user_id',
  })
  userId: number

  @PrimaryColumn({
    name: 'module_id',
  })
  moduleId: number

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user: UserEntity[]

  @ManyToOne(() => ModuleEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'module_id',
    referencedColumnName: 'id',
  })
  module: ModuleEntity[]

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date
}
