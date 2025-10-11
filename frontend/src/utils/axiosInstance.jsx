import axios from "axios";

// const home = "192.168.1.44";

const axiosInstance = axios.create({
 baseURL: "http://192.168.1.44:4000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
