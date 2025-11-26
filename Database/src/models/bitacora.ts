import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    ForeignKey,
    BelongsTo
} from "sequelize-typescript";

@Table({ tableName: "bitacora", timestamps: false })
export class Bitacora extends Model {
    @PrimaryKey
    @Column(DataType.INTEGER)
    idUsuario!: number;

    @Column(DataType.DATE)
    horaInicio?: Date;

    @Column(DataType.DATE)
    horaFin?: Date;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    descripcion!: string;

    @Column(DataType.ENUM('REPORTE_INCIDENTE', 'OTRO'))
    tipo?: string;

    @Column({
        type: DataType.DATE,
        defaultValue: DataType.NOW
    })
    fecha?: Date;

    @Column({
        type:DataType.INTEGER,
        allowNull: false
    })
    idEmpleado!: number;

}