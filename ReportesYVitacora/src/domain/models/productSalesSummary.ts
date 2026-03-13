import {
  Table,
  Column,
  Model,
  DataType,
  AutoIncrement,
  PrimaryKey
} from 'sequelize-typescript';

@Table({
  tableName: 'product_sales_summary',
  timestamps: false,
  indexes: [
    {
      name: 'idx_producto_fecha',
      fields: ['idProducto', 'fecha']
    }
  ]
})
export class ProductSalesSummary extends Model<ProductSalesSummary> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  idProducto!: number;

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
  cantidadVendida!: number;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  })
  ingresosGenerados!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  createdAt!: Date;
}
