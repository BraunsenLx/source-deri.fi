// this file is generated by script, don't modify it !!!
import { contractFactory } from "../../../shared/utils/index.js";
import {
  poolImplementationAdapter,
} from "../adapter/pool.js";
import { PoolImplementation } from "../gen/PoolImplementation.js";

export const poolImplementationFactory = contractFactory(
  poolImplementationAdapter(PoolImplementation)
);
