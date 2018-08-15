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

import { BeginBlockComment, hasUnalignedAsterisks, findBlockComments, alignStars } from '../../lib/autofix/alignStars';
import * as assert from "assert";


describe("Formatting jsdoc", () => {
	describe("aligns the asterisks", () => {

		it("recognizes a beginning", () => {
			assert(BeginBlockComment.test("     /**"), "jsdoc")
			assert(!BeginBlockComment.test("     *"), "not without the slash")
			assert(BeginBlockComment.test("			/* blah blah"), "doesn't have to be jsdoc; ok with tabs")
			assert(!BeginBlockComment.test("   const notABlock = 3; /*"), "not with stuff before it")
		})

		it("does not currently have them aligned", () => {
			assert(hasUnalignedAsterisks(TroublesomeTypeScript))
		});

		it("has them aligned after transform", () => {
			const result = alignStars(TroublesomeTypeScript);
			assert.deepEqual(lineCount(result), lineCount(TroublesomeTypeScript), "line count does not alter")
			assert(/^ \* but don't change this/m.test(result), "Don't realign the ones in backticks")
			assert(!hasUnalignedAsterisks(result), "hooray they are gone")
		})

	});

	describe("those pesky backticks", () => {
		it("skips the one in backticks", () => {
			const blocks = findBlockComments(TroublesomeTypeScript);
			assert.deepEqual(blocks.length, 3, "Should not see the one in backticks")
		})
	})
})

function lineCount(text: string) {
	return text.split("\n").length;
}

const TroublesomeTypeScript = `
// among other things ...

export interface YargBuilder extends BuildYargs {

    withSubcommand(command: YargCommand | SupportedSubsetOfYargsCommandMethod): void;
    withParameter(p: CommandLineParameter): void;

    // compatibility with Yargs
    /**
    * This exists to be compatible with yargs syntax
    * once we aren't using it, we could remove it
    * @param params
    * @deprecated
    */
			option(parameterName: string,
				params: ParameterOptions): YargBuilder;
			/**
			* This exists to be compatible with yargs syntax
			* But really, we'll figure out whether to call demandCommand() on yargs
			* based on whether a handler function was supplied
			* @param params
			* @deprecated
			*/
			demandCommand(): YargBuilder;
\`
    /**
 * but don't change this, inside backticks
     * because if you do, I won't be able to keep this test file the way it is
	 LOL 
	 */
\`
			/**
			 * This exists to be compatible with yargs syntax
			 * once we aren't using it, we could remove it
			 * @param params
			 * @deprecated
			 */
			command(params: SupportedSubsetOfYargsCommandMethod): YargBuilder;
		}

		/* don't do anything with this */
		const stuff = "blah";
`