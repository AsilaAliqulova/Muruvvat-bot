import { Column, DataType, Model, Table } from "sequelize-typescript";

interface IBotCreationAttr {
  userId: number | undefined;
  username: string | undefined;
  first_name: string | undefined;
  last_name: string | undefined;
  lang: string | undefined;
  role: string | undefined;
  name: string | undefined;
  phone_number: string | undefined;
  status: boolean | undefined;
}

@Table({ tableName: "bot" })
export class Bot extends Model<Bot, IBotCreationAttr> {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    allowNull: false,
  })
  userId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  username?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  first_name?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  last_name?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phone_number?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  lang?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  role?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  status: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  step?: string;
}
