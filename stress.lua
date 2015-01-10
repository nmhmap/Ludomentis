math.randomseed(tick());
local http = game:GetService("HttpService");
local url = "http://quadvector.tk";

--how many players to simulate
local players = 100;

local function makePlayer(i)
	return {
		name = "ktalsj;df";
		id = i;
		rank = math.random(750, 1350);
		type = "ranked";
		placeid = math.random(0, 300000000);
	}
end

local function addQueue(i)
	local playerTable = makePlayer(i);
	playerTable = http:JSONEncode(playerTable);
	local success, result = pcall(function() return http:PostAsync(url..'/join', playerTable); end);
	if not success then print("err: ", result, url..'/join'); end
	return success, result;
end

local function removeQueue(i)
	local success, result = pcall(function() return http:GetAsync(url..'/leave/'..i, true); end);
	if not success then print("err: ", result, url..'/leave/'..i); end
	return success, result;
end

local function confirm(i)
	local success, result = pcall(function() return http:GetAsync(url..'/confirm/add/'..i, true); end);
	if not success then print("err: ", result, url..'/confirm/add/'..i); end
	return result;
end

local function simulate()
	for i=0, players do
		addQueue(i);
		spawn(function()
			while true do
				wait(1);
				local success, result = pcall(function() return http:JSONDecode(http:GetAsync(url..'/confirm', true)) end);
				if success then
					for _,v in pairs(result) do
						if v.players[1].id == i then
							if not v.players[1].confirm then
								confirm(i);
							end
							v.players[1].confirm = true;
							if v.players[1].confirm and v.players[2].confirm then
								removeQueue(i);
							end
							break;
						elseif v.players[2].id == i then
							if not v.players[2].confirm then
								confirm(i);
							end
							v.players[2].confirm = true;
							if v.players[1].confirm and v.players[2].confirm then
								removeQueue(i);
							end
							break;
						end
					end
				else
					print("err: ", result);
					wait(15);
				end
			end
		end)
	end
end
simulate();