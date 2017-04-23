```
$ docker run -t --rm -e "ACCESS_TOKEN=..." asannou/tootcat friends.nico
```

or

```
$ docker run -d --name tootcat -p 7007:7007 -e "ACCESS_TOKEN=..." asannou/tootcat friends.nico -l 7007
$ telnet localhost 7007
```
