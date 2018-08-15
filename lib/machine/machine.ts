/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    SoftwareDeliveryMachine,
    SoftwareDeliveryMachineConfiguration,
    onAnyPush,
    AutofixGoal,
} from "@atomist/sdm";
import {
    createSoftwareDeliveryMachine,
} from "@atomist/sdm-core";
import { AlignAsterisksInBlockComments, AlignStarsTransform } from "../autofix/AlignStarsTransform";

export function machine(
    configuration: SoftwareDeliveryMachineConfiguration,
): SoftwareDeliveryMachine {

    const sdm = createSoftwareDeliveryMachine({
        name: "Minimal Transform + Autofix Software Delivery Machine",
        configuration,
    });


    sdm.addAutofix(AlignAsterisksInBlockComments)
    sdm.addCodeTransformCommand(AlignStarsTransform)

    /* Run the autofixes on every commit */
    sdm.addGoalContributions(onAnyPush().setGoals(AutofixGoal));

    return sdm;
}
