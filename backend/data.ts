import { promises as fs } from "fs";
import { BaseImpl, Car, User } from "./types.js";

const USERS_PATH = "./db/users.json";
const CARS_PATH = "./db/cars.json";

async function loadFile2(filePath: string) {
  const rawData = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(rawData);
  return data;
}
async function saveFile2(filePath: string, data: any) {
  await fs.writeFile(filePath, JSON.stringify(data));
}

export async function loadUsers2(): Promise<BaseImpl<User>> {
  return new BaseImpl(await loadFile2(USERS_PATH));
}
export async function loadCars2(): Promise<BaseImpl<Car>> {
  return new BaseImpl(await loadFile2(CARS_PATH));
}
export async function saveUsers(data: User[]): Promise<void> {
  await saveFile2(USERS_PATH, data);
}
export async function saveCars(data: Car[]): Promise<void> {
  await saveFile2(CARS_PATH, data);
}
