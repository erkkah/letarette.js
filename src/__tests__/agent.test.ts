import {mergeResponses} from "../agent";
import {SearchResponse, SearchStatusCode} from "../protocol";

describe("Search result merging", () => {
    const responseA: SearchResponse = {
        Duration: 10,
        Status: SearchStatusCode.NoHit,
        Result: {
            Hits: [
                {
                    ID: "1",
                    Rank: 1,
                    Snippet: "1",
                    Space: "test",
                },
                {
                    ID: "3",
                    Rank: 3,
                    Snippet: "3",
                    Space: "test",
                },
            ],
            TotalHits: 12,
            Respelt: "",
            RespeltDistance: 0,
            Capped: true,
        },
    };

    const responseB: SearchResponse = {
        Duration: 20,
        Status: SearchStatusCode.QueryError,
        Result: {
            Hits: [
                {
                    ID: "2",
                    Rank: 2,
                    Snippet: "2",
                    Space: "test",
                },
                {
                    ID: "4",
                    Rank: 4,
                    Snippet: "4",
                    Space: "test",
                },
            ],
            Respelt: "",
            RespeltDistance: 0,
            TotalHits: 34,
            Capped: false,
        },
    };

    it("merges durations correctly", () => {
        const merged = mergeResponses([responseA, responseB]);
        expect(merged.Duration).toBe(20);
    });

    it("merges status correctly", () => {
        const merged = mergeResponses([responseA, responseB]);
        expect(merged.Status).toBe(SearchStatusCode.QueryError);
    });

    it("merges total hits correctly", () => {
        const merged = mergeResponses([responseA, responseB]);
        expect(merged.Result.TotalHits).toBe(46);
    });

    it("merges capped correctly", () => {
        const merged = mergeResponses([responseA, responseB]);
        expect(merged.Result.Capped).toBeTruthy();
    });

    it("merges hits correctly", () => {
        const merged = mergeResponses([responseA, responseB]);
        for (let i = 0; i < 4; i++) {
            expect(merged.Result.Hits[i].ID).toBe("" + (i + 1));
        }
    });
});
