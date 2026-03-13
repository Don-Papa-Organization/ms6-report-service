import {
  Table,
  Column,
  Model,
  DataType,
  AutoIncrement,
  PrimaryKey
} from 'sequelize-typescript';

@Table({
  tableName: 'category_stock_summary',
  timestamps: false,
  indexes: [
    {
      name: 'idx_categoria_fecha',
      fields: ['idCategoria', 'fecha']
    }
  ]
})
export class CategoryStockSummary extends Model<CategoryStockSummary> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  idCategoria!: number;

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
  stockTotal!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0
  })
  productosUnicos!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  createdAt!: Date;
}
