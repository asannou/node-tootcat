```
$ docker run -it --rm -e "ACCESS_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" asannou/tootcat friends.nico
```

or

```
$ docker run -d --name tootcat -p 7007:7007 -e "ACCESS_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" asannou/tootcat friends.nico 7007
$ telnet localhost 7007
```
