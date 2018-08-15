import { doWithFiles, fileExists } from '@atomist/automation-client/project/util/projectUtils';
import { CodeTransform, CodeTransformRegistration, AutofixRegistration, PushTest } from '@atomist/sdm';
import { Project } from '@atomist/automation-client/project/Project';

const TypeScriptGlob = "**/*.ts";

const alignAsterisks: CodeTransform = async (p: Project) => {

    await doWithFiles(p, TypeScriptGlob, async f => {
        const content = await f.getContent();
        if (hasUnalignedAsterisks(content)) {
            await f.setContent(alignAsterisksInBlockComments(content));
        }
    });

    return p;
}

export const AlignAsterisksTransform: CodeTransformRegistration = {
    name: "AlignAsterisks",
    transform: alignAsterisks,
    intent: "dammit jsdoc"
}

const IsTypeScript: PushTest = {
    name: "IsTypeScript",
    mapping: async (pci) => fileExists(pci.project, TypeScriptGlob, () => true)
}

export const AlignAsterisksInBlockComments: AutofixRegistration = {
    name: "Align asterisks in jsdoc",
    transform: alignAsterisks,
    pushTest: IsTypeScript,
}

// a block comment begins with a line starting with (whitespace and) /*
// it ends with a line containing */
export const BeginBlockComment = /^(\s*)\/\*/;

// a block comment ends with any line containing */
export const EndBlockComment = /\*\//;

export function hasUnalignedAsterisks(text: string): boolean {
    return !findBlockComments(text).every(asterisksAreAligned);
}

export function alignAsterisksInBlockComments(text: string): string {
    const lines = text.split("\n");
    const outputLines = pipeThroughIteratee(passThroughBackticks(passThroughUntilBlockComment), lines);
    return outputLines.join("\n");
}

/**
 * A function that can process a line; it decides what to do about the next line (proceed)
 * and what if anything to contribute to the final output.
 */
type LineIteratee<Emission> = (line: string) => { proceed: LineIteratee<Emission>, emit?: Emission[] }

const passThroughUntilBlockComment: LineIteratee<string> = (line) => {
    if (BeginBlockComment.test(line) && !EndBlockComment.test(line)) {
        return { proceed: processBlockComment([line]) };
    } else {
        return { proceed: passThroughUntilBlockComment, emit: [line] };
    }
}

function processBlockComment(before: string[]): LineIteratee<string> {
    return (line) => {
        const soFar = [...before, line];
        if (EndBlockComment.test(line)) {
            return { proceed: passThroughUntilBlockComment, emit: alignBlockComment(soFar) };
        } else {
            return { proceed: processBlockComment(soFar) };
        }
    }
}


type BlockCommentLines = string[];

function alignBlockComment(blockCommentLines: BlockCommentLines): BlockCommentLines {
    const [first, ...rest] = blockCommentLines;
    const firstWhitespace = BeginBlockComment.exec(first)[1];
    const expectedBeginningOfRest = firstWhitespace + " *";
    return [first, ...rest.map(l => l.replace(/^\s*\*/, expectedBeginningOfRest))];
}

export function findBlockComments(text: string): BlockCommentLines[] {
    const lines = text.split("\n");
    const blockComments: BlockCommentLines[] = pipeThroughIteratee(eatBackticks(lookForBlockComment), lines);
    return blockComments; //.map(bc => bc.join("\n"));
}

export function asterisksAreAligned(commentLines: BlockCommentLines): boolean {
    const [first, ...rest] = commentLines;
    const firstWhitespace = BeginBlockComment.exec(first)[1];
    const expectedBeginningOfRest = firstWhitespace + " *";
    return rest.every(l => l.startsWith(expectedBeginningOfRest));
}


const lookForBlockComment: LineIteratee<BlockCommentLines> = (line) => {
    if (BeginBlockComment.test(line) && !EndBlockComment.test(line)) {
        return { proceed: emitBlockCommentAtEnd([line]) };
    } else {
        return { proceed: lookForBlockComment };
    }
}

function countBackticks(line: string): number {
    // but not escaped backticks.
    return line.replace("\\'", "").split("`").length - 1
}
/* Any line that starts or ends a backtick string is also eaten */
function eatBackticks<T>(inner: LineIteratee<T>): LineIteratee<T> {
    return (line) => {
        if (countBackticks(line) % 2 === 1) { // we have an odd number; enter backtickland
            return { proceed: eatUntilClosingBacktick(inner) };
        } else {
            // just wrap the iteratee result
            const innerResult = inner(line);
            return {
                emit: innerResult.emit,
                proceed: eatBackticks(innerResult.proceed)
            };
        }
    }
}
function eatUntilClosingBacktick<T>(inner: LineIteratee<T>): LineIteratee<T> {
    return (line) => {
        if (countBackticks(line) % 2 === 1) { // we have an odd number; exit backtickland
            return { proceed: eatBackticks(inner) };
        } else {
            // keep eating. the inner one does not advance
            return { proceed: eatUntilClosingBacktick(inner) };
        }
    }
}

/* Any line that starts or ends a backtick string is also passed through */
function passThroughBackticks(inner: LineIteratee<string>): LineIteratee<string> {
    return (line) => {
        if (countBackticks(line) % 2 === 1) { // we have an odd number; enter backtickland
            return {
                proceed: passThroughUntilClosingBacktick(inner),
                emit: [line]
            };
        } else {
            // just wrap the iteratee result; it gets to proceed
            const innerResult = inner(line);
            return {
                emit: innerResult.emit,
                proceed: passThroughBackticks(innerResult.proceed)
            };
        }
    }
}
function passThroughUntilClosingBacktick<T>(inner: LineIteratee<string>): LineIteratee<string> {
    return (line) => {
        if (countBackticks(line) % 2 === 1) { // we have an odd number; exit backtickland after this line
            return {
                proceed: passThroughBackticks(inner),
                emit: [line]
            };
        } else {
            // the inner one does not advance
            return {
                proceed: passThroughUntilClosingBacktick(inner),
                emit: [line]
            };
        }
    }
}

function emitBlockCommentAtEnd(before: string[]): LineIteratee<BlockCommentLines> {
    return (line) => {
        const soFar = [...before, line];
        if (EndBlockComment.test(line)) {
            return { proceed: lookForBlockComment, emit: [soFar] };
        } else {
            return { proceed: emitBlockCommentAtEnd(soFar) };
        }
    }
}

function pipeThroughIteratee<Emission>(start: LineIteratee<Emission>, lines: string[]): Emission[] {
    const emissions: Emission[] = [];
    let iteratee = start;
    // it's technically possible to use `reduce` but this is clearer IMO. Reduce gets confusing quickly
    lines.forEach(line => {
        const { proceed, emit } = iteratee(line);
        iteratee = proceed;
        if (emit !== undefined) {
            emit.forEach(e => emissions.push(e));
        }
    })
    return emissions;
}