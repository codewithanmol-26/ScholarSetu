import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true, nullable: true }) mobile?: string;
  @Column({ name: 'password_hash', nullable: true }) passwordHash?: string;
  @Column({ default: 'student' }) role: string;
  @Column({ name: 'otr_id', nullable: true }) otrId?: string;
  @Column({ name: 'digilocker_id', unique: true, nullable: true }) digilockerId?: string;
}
