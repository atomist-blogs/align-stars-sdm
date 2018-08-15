

// a block comment begins with a line starting with (whitespace and) /*
// it ends with a line containing */
export const BeginBlockComment = /^(\s*)\/\*/;

// a block comment ends with any line containing */
export const EndBlockComment = /\*\//;

export function hasUnalignedAsterisks(text: string): boolean {
    return !findBlockComments(text).every(asterisksAreAligned);
}

export function alignStars(text: string): string {
    const lines = text.split("\n");
    const outputLines = pipeThroughIteratee(passThroughBackticks(passThroughUntilBlockComment), lines);
    return outputLines.join("\n");
}

/**
 * Align the asterisks at the beginning of lines in a block comment.
 * It'll ignore lines that don't start with *
 * @param blockCommentLines all the lines in the comment
 */
function alignBlockComment(blockCommentLines: BlockCommentLines): BlockCommentLines {
    const [first, ...rest] = blockCommentLines;
    const firstWhitespace = BeginBlockComment.exec(first)[1];
    const expectedBeginningOfRest = firstWhitespace + " *";
    return [first, ...rest.map(l => l.replace(/^\s*\*/, expectedBeginningOfRest))];
}

/**
 * A function that can process a line; it decides what to do about the next line (proceed)
 * and what if anything to contribute to the final output.
 * Such functional programming. Very referentially transparent.
 */
type LineIteratee<Emission> = (line: string) => { proceed: LineIteratee<Emission>, emit?: Emission[] }

/**
 * I had fun implementing this iteratee-style. This one looks for the beginning of a block comment.
 * If it finds it, it switches processing over to processBlockComment.
 * Otherwise it passes the line through.
 * @param line one line of JS or TS.
 */
const passThroughUntilBlockComment: LineIteratee<string> = (line) => {
    if (BeginBlockComment.test(line) && !EndBlockComment.test(line)) {
        return { proceed: processBlockComment([line]) };
    } else {
        return { proceed: passThroughUntilBlockComment, emit: [line] };
    }
}

/**
 * This one receives lines while we're in a block content. It accumulates them
 * until we have the whole thing. Then it emits the whole block comment, except aligned.
 * When the comment ends, it switches processing back to passThroughUntilBlockComment.
 * @param before the lines in the block comment so far.
 */
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

/**
 * This function is used in tests and in the check of whether there is anything to do in this file.
 * @param text file content
 * @return an array of block comments (each of which is an array of strings)
 */
export function findBlockComments(text: string): BlockCommentLines[] {
    const lines = text.split("\n");
    const blockComments: BlockCommentLines[] = pipeThroughIteratee(eatBackticks(lookForBlockComment), lines);
    return blockComments;
}

/**
 * Check whether the asterisks are aligned.
 * @param commentLines the block comment
 */
export function asterisksAreAligned(commentLines: BlockCommentLines): boolean {
    const [first, ...rest] = commentLines;
    const firstWhitespace = BeginBlockComment.exec(first)[1];
    const expectedBeginningOfRest = firstWhitespace + " *";
    return rest.every(l => l.startsWith(expectedBeginningOfRest));
}

/**
 * Look for the beginning of a block comment and switch processing to emitBlockCommentAtEnd.
 * Eat the lines (don't emit them) while outside.
 * @param line outside of a block comment
 */
const lookForBlockComment: LineIteratee<BlockCommentLines> = (line) => {
    if (BeginBlockComment.test(line) && !EndBlockComment.test(line)) {
        return { proceed: emitBlockCommentAtEnd([line]) };
    } else {
        return { proceed: lookForBlockComment };
    }
}

/**
 * Read lines inside the block comment until it ends. When it ends, emit them all in one chunk
 * and switch practicing back to lookForBlockComment.
 * @param before accumulated lines
 */
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

/**
 * How many unescaped backticks are in this line?
 * @param line text
 */
function countBackticks(line: string): number {
    // but not escaped backticks.
    return line.replace("\\'", "").split("`").length - 1
}

/**
 * This wraps a LineIteratee, and it eats lines that include backtick-delimited strings.
 * Unfortunately I think it will also eat lines that are in comments and have backticks. This is not easy.
 * But it's sufficient for what I need to do, so we're good!
 * 
 */
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

/**
 * Plumbing for the iteratees.
 * 
 * I saw that lodash had "iteratee" as the argument to map and I was all excited
 * but NO it uses that word completely differently
 * This way is cooler.
 * 
 * @param start LineIteratee that will process the first line
 * @param lines all the lines to process
 */
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