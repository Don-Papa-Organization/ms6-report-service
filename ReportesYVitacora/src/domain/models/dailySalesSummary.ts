import {
  Table,
  Column,
  Model,
  DataType,
  AutoIncrement,
  PrimaryKey
} from 'sequelize-typescript';

@Table({
  tableName: 'daily_sales_summary',
  timestamps: false,
  indexes: [
    {
      name: 'idx_fecha',
      fields: ['fecha']
    }
  ]
})
export class DailySalesSummary extends Model<DailySalesSummary> {
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
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  totalVentas!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  cantidadPedidos!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  canalFisico!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  canalWeb!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  totalDescuentos!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  createdAt!: Date;
}
