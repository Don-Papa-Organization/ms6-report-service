import {
  Table,
  Column,
  Model,
  DataType,
  AutoIncrement,
  PrimaryKey
} from 'sequelize-typescript';

@Table({
  tableName: 'promotion_performance',
  timestamps: false,
  indexes: [
    {
      name: 'idx_promocion_fecha',
      fields: ['idPromocion', 'fecha']
    }
  ]
})
export class PromotionPerformance extends Model<PromotionPerformance> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  idPromocion!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  idEvento?: number;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  fecha!: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  usosAplicados!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  ingresoBajoPromocion!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  createdAt!: Date;
}
