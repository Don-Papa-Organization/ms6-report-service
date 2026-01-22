import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    ForeignKey,
    BelongsTo
} from "sequelize-typescript";

@Table({ tableName: "bitacora", timestamps: false })
export class Bitacora extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    idBitacora!: number;

    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
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

    @Column(DataType.ENUM('REPORTE_INCIDENTE', 'COMENTARIO_JORNADA', 'OTRO'))
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