import axios from "axios";
import { toast } from "react-toastify";

const handleNotificationSignup = async (tvShowId: number) => {
  try {
    const response = await axios.post("/api/users/notifyusers", {
      tvShowId: tvShowId,
    });

    const { message, emailSent } = response.data;

    if (emailSent) {
      toast.success(message);
    } else {
      toast.info(message);
    }
  } catch (err: any) {
    console.error("Failed to sign up for notification:", err);
    const errorMessage =
      err.response?.data?.message ||
      "Error: Could not set up notification. Please log in or try again.";

    if (errorMessage.includes("already subscribed")) {
      toast.info(errorMessage);
    } else {
      toast.error(errorMessage);
    }
  }
};

export default handleNotificationSignup;
