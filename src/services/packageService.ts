import { Package, IPackage } from "../models/Package";

// This function is used by the seeder script.
export const upsertPackage = async (
  name: string,
  data: Record<string, any>
) => {
  await Package.findOneAndUpdate(
    { name },
    { $set: data, $setOnInsert: { name } },
    { upsert: true, new: true }
  );
};

export class PackageService {
  static async list() {
    return Package.find({ status: "active" }).sort({ "price.monthly": 1 });
  }

  static async create(data: Partial<IPackage>) {
    const newPackage = new Package(data);
    return newPackage.save();
  }

  static async update(name: string, data: Partial<IPackage>) {
    return Package.findOneAndUpdate({ name }, data, { new: true });
  }

  static async delete(name: string) {
    // Soft-delete by changing status to 'deprecated'
    return Package.findOneAndUpdate(
      { name },
      { status: "deprecated" },
      { new: true }
    );
  }
}
