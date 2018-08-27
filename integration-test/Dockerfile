FROM node

# it already has git
# RUN apt-get install -y git 

RUN npm install -g @atomist/cli@next

# fast stuff last

WORKDIR /app
ADD . /app

RUN "./slow_stuff.sh"
CMD "./fast_stuff.sh"