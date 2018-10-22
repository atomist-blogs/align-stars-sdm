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

import { Project, projectUtils } from "@atomist/automation-client";
import { AutofixRegistration, CodeTransform, CodeTransformRegistration, PushTest } from "@atomist/sdm";
import { alignStars, hasUnalignedAsterisks } from "./alignStars";

const alignAsterisksInProject: CodeTransform = (project: Project) =>
    projectUtils.doWithFiles(project, "**/*.ts", async f => {
        const content = await f.getContent();
        if (hasUnalignedAsterisks(content)) {
            await f.setContent(alignStars(content));
        }
    });

export const AlignStarsTransform: CodeTransformRegistration = {
    name: "AlignAsterisks",
    transform: alignAsterisksInProject,
    intent: "align the stars",
};

const IsTypeScript: PushTest = {
    name: "IsTypeScript",
    mapping: async pci => projectUtils.fileExists(pci.project, "**/*.ts", () => true),
};

export const AlignAsterisksInBlockComments: AutofixRegistration = {
    name: "Align asterisks in jsdoc",
    transform: alignAsterisksInProject,
    pushTest: IsTypeScript,
};
