import {
  Table,
  Column,
  Model,
  DataType,
  AutoIncrement,
  PrimaryKey
} from 'sequelize-typescript';

@Table({
  tableName: 'reservation_occupancy_summary',
  timestamps: false,
  indexes: [
    {
      name: 'idx_fecha',
      fields: ['fecha']
    }
  ]
})
export class ReservationOccupancySummary extends Model<ReservationOccupancySummary> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  fecha!: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  horaPico?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  cantidadReservas!: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  })
  tasaNoShow!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  createdAt!: Date;
}
