import { commonConstants } from "src/global/constants/common.constants";

const { LOCAL, TEST, DEV, PROD } = commonConstants.props.nodeEnvs;

let envFilePAth = "envs/.env.local";
if (process.env.NODE_ENV === TEST) envFilePAth = "envs/.env.test";
if (process.env.NODE_ENV === DEV) envFilePAth = "envs/.env.dev";
else if (process.env.NODE_ENV === PROD) envFilePAth = "envs/.env.prod";

export default envFilePAth;
