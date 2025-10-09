import mongoose from "mongoose";

export async function Database() {
  try {
    mongoose.connect(process.env.MONGO_URL!);

    const connect = mongoose.connection;

    connect.on("connected", () => {
      console.log("connected to database");
    });

    connect.on("error", (err) => {
      console.log("connection error make sure database is working" + err);
      process.exit();
    });
  } catch (err) {
    console.log("did not connect");
    console.log(err);
  }
}
