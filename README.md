```
$ docker run -t --rm -e "TC_USERNAME=..." -e "TC_PASSWORD=..." asannou/tootcat friends.nico
```

or

```
$ docker run -d --name tootcat -p 7007:7007 -e "TC_USERNAME=..." -e "TC_PASSWORD=..." asannou/tootcat friends.nico -l 7007
$ telnet localhost 7007
```
