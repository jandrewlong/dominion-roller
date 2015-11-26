===============
Dominion Roller
===============

Dominion Roller is an HTML5 mobile application that generates a random list of
kingdom cards (and other supply cards) for a game of Dominion. It is designed
to be hosted on the Google App Engine public cloud.

You'll need the following:
 * JDK1.7 or better
 * Apache Ant (ant.apache.org)
 * Google App Engine SDK for Java


Installation
============

Git clone the source code onto your development workstation, then
create a 'extlib' subdirectory, and copy into it these jar files:
 * jackson-core-2.1.x.jar (wiki.fasterxml.com/JacksonHome)
 * servlet-api.jar (from Google App Engine SDK)
 * appengine-api.jar (from Google App Engine SDK)

Now run `ant deploy-appengine'.

If successful, this will create a subdirectory named deploy.appengine,
which you can use for testing the application or to deploy it directly
to the cloud.

To test the application, run this command from the Google App Engine
SDK's bin directory:

 ./dev_appserver.sh /path/to/dominion/deploy.appengine

Then connect to your test application at http://localhost:8080/.
