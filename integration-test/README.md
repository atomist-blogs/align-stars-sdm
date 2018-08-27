# Integration test help

Goal: test the blog post steps.

To bring in the latest from @atomist/cli and this repo:

`docker build --no-cache -t align-stars-sdm-test .`

And then start up this SDM

`docker run --name star-test --rm align-stars-sdm-test`

And then in another window, run the feed:

```
docker exec -it star-test /bin/bash

atomist feed
```

And then in another window, do some tests:

```
docker exec -it test /bin/bash

atomist describe sdm
cd ~/atomist/atomist-blogs/align-stars-sdm
sed 's/ \*/*/' alignStars.ts > alignStars2.ts
mv alignStars2.ts alignStars.ts
git add alignStars.ts
git commit -m "Mess up the formatting"
```

This should result in activity in the feed window, and a new commit in your repo in the docker container. (run `git log` in the that last window to see it)

