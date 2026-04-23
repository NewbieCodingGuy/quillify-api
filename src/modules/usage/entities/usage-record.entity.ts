import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('usage_records')
@Unique(['userId', 'date']) // one record per user per day
export class UsageRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'date' })
  date: string; // stored as YYYY-MM-DD

  @Column({ default: 0 })
  requestCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
