import { CodeInspection, CodeInspectionRegistration } from "@atomist/sdm";

import { Project } from "@atomist/automation-client/project/Project";

import { doWithFiles } from "@atomist/automation-client/project/util/projectUtils";

import { hasUnalignedAsterisks } from "./alignStars";

interface UnalignedStarsReport {
    messyFiles: string[]
}

const TypeScriptGlob = "**/*.ts";

const findUnalignedStars: CodeInspection<UnalignedStarsReport> = async (p: Project) => {

    const messyFiles: string[] = []
    await doWithFiles(p, TypeScriptGlob, async f => {
        const content = await f.getContent();
        if (hasUnalignedAsterisks(content)) {
            messyFiles.push(f.path)
        }
    });

    return { messyFiles };
}

export const AlignStarsInspection: CodeInspectionRegistration<UnalignedStarsReport> = {
    name: "Find Unaligned Stars",
    inspection: findUnalignedStars,
    intent: "check the stars",
    react: (badness, inv) => inv.addressChannels(badness.map(b =>
        b.repoId.repo + " contains messy files:\n   " + b.result.messyFiles.join("\n   ")).join("\n---\n"))
}